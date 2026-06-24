# Google Search Console — marketing site (school.makylegacy.com)

This guide connects the marketing site to Google Search Console so Google can crawl, index, and show rich link previews.

## What is already configured in code

| Asset | URL / location |
|-------|----------------|
| Sitemap | `https://school.makylegacy.com/sitemap.xml` |
| Robots | `https://school.makylegacy.com/robots.txt` |
| Open Graph image | `https://school.makylegacy.com/opengraph-image` (1200×630, logo + branding) |
| Favicon / logo | `/makyschool-logo.jpeg`, `app/icon.jpg` |
| JSON-LD | Organization, WebSite, SoftwareApplication, Product, FAQ, LocalBusiness |
| Web manifest | `https://school.makylegacy.com/manifest.webmanifest` |

Set `NEXT_PUBLIC_SITE_URL=https://school.makylegacy.com` in production (Vercel → Environment Variables).

## Step 1 — Verify ownership (HTML meta tag)

1. Open [Google Search Console](https://search.google.com/search-console) and add a **URL prefix** property: `https://school.makylegacy.com`
2. Choose verification method **HTML tag**
3. Copy only the `content` value from the meta tag, e.g. if Google gives:
   ```html
   <meta name="google-site-verification" content="AbCdEf123..." />
   ```
   copy `AbCdEf123...`
4. Add to Vercel (marketing project) or root `.env`:
   ```
   GOOGLE_SITE_VERIFICATION=AbCdEf123...
   ```
   Or use `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` if the value must be baked in at build time.
5. Redeploy the marketing site
6. Click **Verify** in Search Console

### Alternative: HTML file upload

If you prefer the file method, Google provides a file like `google123abc.html`. Place it in:

```
apps/marketing/public/google123abc.html
```

Commit, deploy, then verify. Remove the env var method if you use this instead.

### Alternative: DNS TXT record

Add the TXT record Google provides to your `makylegacy.com` DNS. No code change required.

## Step 2 — Submit sitemap

After verification:

1. Search Console → **Sitemaps**
2. Submit: `https://school.makylegacy.com/sitemap.xml`
3. Wait for Google to process (usually minutes to a few days)

## Step 3 — Request indexing (optional)

For faster first crawl of key pages:

1. **URL inspection** → enter `https://school.makylegacy.com/`
2. Click **Request indexing**
3. Repeat for `/features`, `/pricing`, `/solutions`, `/contact`

## Step 4 — Test link previews (Open Graph)

After deploy, test how links appear when shared:

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [Twitter/X Card Validator](https://cards-dev.twitter.com/validator) (if available)

Enter `https://school.makylegacy.com` — you should see the MakySchool logo on a branded 1200×630 card.

If previews show an old image, use each tool’s **Scrape again** / **Refresh** option.

## Ranking note

Search Console enables indexing and monitoring; it does not guarantee position #1. Ranking depends on content quality, backlinks, competition, and ongoing SEO. The site already targets Uganda school-management keywords in metadata and structured data — monitor **Performance** in Search Console after a few weeks.

## Local check before deploy

```bash
npm run build --workspace=@makyschool/marketing
# Static output in apps/marketing/out/
# Confirm: out/sitemap.xml, out/robots.txt, out/opengraph-image
```
