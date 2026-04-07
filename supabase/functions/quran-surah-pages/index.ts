import { corsHeaders } from '../_shared/cors.ts';
import { qfApiGet } from '../_shared/qf-token.ts';

/**
 * Edge Function: quran-surah-pages
 *
 * Returns word-level Mushaf page data for a given chapter, using the
 * Quran Foundation Content API with IndoPak script (mushaf=3).
 *
 * Request body:
 *   { chapter_number: number, mushaf?: number }
 *   mushaf defaults to 3 (IndoPak, 604 pages)
 *
 * Flow:
 *   1. GET /pages/lookup?chapter_number={n}&mushaf={m}  → page boundaries
 *   2. For each page: GET /verses/by_page/{page}?mushaf={m}&words=true
 *   3. Assemble word-level data grouped by page → line
 *
 * Response:
 *   { pages: QFMushafPage[] }
 *
 * QFMushafPage:
 *   { pageNumber, lines: { lineNumber, words: { text, charType, verseKey }[] }[], verses: QFVerse[] }
 */

// ── Mushaf IDs ────────────────────────────────────────────────────────────
// 3 = IndoPak script (604 pages, same page count as Medina Mushaf)

interface PagesLookupResponse {
  lookupRange: { from: string; to: string };
  pages: Record<string, { from: string; to: string; firstVerseKey: string; lastVerseKey: string }>;
  totalPage: number;
}

interface QFWord {
  id: number;
  position: number;
  page_number: number;
  line_number: number;
  text_indopak: string;
  text_uthmani?: string;
  char_type_name: string;
  verse_key?: string;
  transliteration?: { text: string };
}

interface QFVerse {
  id: number;
  verse_key: string;
  verse_number: number;
  page_number: number;
  juz_number: number;
  text_indopak: string;
  words: QFWord[];
  translations?: { resource_id: number; text: string }[];
}

interface QFVersesByPageResponse {
  verses: QFVerse[];
  pagination?: { current_page: number; next_page: number | null; total_count: number };
}

Deno.serve(async (req) => {
  // ── CORS preflight ───────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Parse request
    let chapterNumber = 36;
    let mushaId = 3; // IndoPak

    try {
      const body = await req.json();
      if (body?.chapter_number) chapterNumber = Number(body.chapter_number);
      if (body?.mushaf) mushaId = Number(body.mushaf);
    } catch { /* use defaults */ }

    console.log(`quran-surah-pages: chapter=${chapterNumber}, mushaf=${mushaId}`);

    // ── Step 1: Get page boundaries for this chapter ─────────────────
    const lookup = await qfApiGet<PagesLookupResponse>(
      `/content/api/v4/pages/lookup?chapter_number=${chapterNumber}&mushaf=${mushaId}`
    );

    if (!lookup?.pages || typeof lookup.pages !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Pages lookup returned unexpected shape' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const pageNumbers = Object.keys(lookup.pages).map(Number).sort((a, b) => a - b);
    console.log(`quran-surah-pages: ${pageNumbers.length} pages: [${pageNumbers.join(', ')}]`);

    // ── Step 2: Fetch verses for each page in parallel ───────────────
    // Use translation 131 (Saheeh International / same as before)
    const pageResults = await Promise.all(
      pageNumbers.map(async (pageNum) => {
        const pageInfo = lookup.pages[String(pageNum)];
        const url =
          `/content/api/v4/verses/by_page/${pageNum}` +
          `?mushaf=${mushaId}` +
          `&words=true` +
          `&word_fields=text_indopak,line_number,page_number,char_type_name` +
          `&fields=text_indopak,verse_key,verse_number,page_number,juz_number` +
          `&translations=131` +
          `&per_page=50` +
          (pageInfo?.from ? `&from=${pageInfo.from}` : '') +
          (pageInfo?.to   ? `&to=${pageInfo.to}`     : '');

        try {
          const data = await qfApiGet<QFVersesByPageResponse>(url);
          return { pageNum, verses: data?.verses ?? [] };
        } catch (err) {
          console.error(`quran-surah-pages: error fetching page ${pageNum}:`, err);
          return { pageNum, verses: [] };
        }
      })
    );

    // ── Step 3: Assemble output ──────────────────────────────────────
    const assembledPages = pageResults.map(({ pageNum, verses }) => {
      // Group words by line number
      const lineMap = new Map<number, { text: string; charType: string; verseKey: string }[]>();

      let firstJuz = 0;

      for (const verse of verses) {
        if (!firstJuz && verse.juz_number) firstJuz = verse.juz_number;
        for (const word of (verse.words ?? [])) {
          const charType = word.char_type_name ?? 'word';

          // Skip end-of-ayah markers — their special QF glyphs (and any
          // other non-word token types) don't render correctly in system fonts.
          if (charType === 'end' || charType === 'chapter_number' || charType === 'page_number') continue;

          const lineNum = word.line_number ?? 1;
          if (!lineMap.has(lineNum)) lineMap.set(lineNum, []);

          let text = (word.text_indopak ?? '').trim();
          if (!text) continue; // skip blank words

          // Strip any remaining QF private-use / special Unicode characters
          // that system fonts cannot render (shows as boxes or Chinese glyphs).
          // Keep standard Arabic block (U+0600–U+06FF), Arabic Presentation
          // Forms-A (U+FB50–U+FDFF), Arabic Presentation Forms-B (U+FE70–U+FEFF),
          // Arabic Extended-A (U+08A0–U+08FF), and common punctuation / space.
          text = text.replace(/[^\u0020-\u007E\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u200C\u200D\u200F\u202A-\u202E]/g, '').trim();
          if (!text) continue; // skip if nothing left after stripping

          lineMap.get(lineNum)!.push({
            text,
            charType,
            verseKey: verse.verse_key,
          });
        }
      }

      const sortedLines = Array.from(lineMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([lineNumber, words]) => {
          // Detect bismillah line
          const joined = words.map(w => w.text).join(' ');
          const isBismillah = joined.includes('بِسۡمِ') || joined.includes('بِسْمِ');
          // Detect centered: bismillah or very few words
          const wordCount = words.filter(w => w.charType === 'word').length;
          const isCentered = isBismillah || wordCount <= 2;

          return { lineNumber, words, isBismillah, isCentered };
        });

      // Build verse summary for translation panel
      const verseSummaries = verses.map(v => ({
        verseKey: v.verse_key,
        verseNumber: v.verse_number,
        textIndopak: v.text_indopak ?? '',
        translation: (v.translations?.[0]?.text ?? '').replace(/<[^>]+>/g, '').trim(),
        juzNumber: v.juz_number ?? firstJuz,
      }));

      // Verse range
      const verseNumbers = verses.map(v => v.verse_number).filter(Boolean);
      const verseRange = verseNumbers.length > 0
        ? [Math.min(...verseNumbers), Math.max(...verseNumbers)]
        : [0, 0];

      return {
        pageNumber: pageNum,
        juzNumber: firstJuz,
        lines: sortedLines,
        verses: verseSummaries,
        verseRange,
      };
    });

    console.log(`quran-surah-pages: assembled ${assembledPages.length} pages for chapter ${chapterNumber}`);

    return new Response(
      JSON.stringify({ pages: assembledPages, totalPages: assembledPages.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('quran-surah-pages: error', err);
    return new Response(
      JSON.stringify({ error: `quran-surah-pages: ${String(err)}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
