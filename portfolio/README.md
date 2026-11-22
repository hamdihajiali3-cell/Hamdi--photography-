# معرض أعمال Hamdi Photography — Portföy

The gallery is intentionally hidden until your genuine photography is available. It never presents stock or AI-created pictures as the studio's work.

When you have pictures, upload them to `portfolio/photos/` (recommended: optimized WebP, 1200–1600px on long side) and list them in `portfolio/manifest.json`. Example:

```json
{
  "items": [
    {
      "src": "photos/portrait-01.webp",
      "title": {"ar": "تصوير شخصي", "tr": "Portre çekimi"},
      "alt": {"ar": "بورتريه من جلسة تصوير حقيقية", "tr": "Gerçek çekimden portre"},
      "description": {"ar": "من أعمال الاستوديو", "tr": "Stüdyo çalışması"}
    }
  ]
}
```

Do not upload client identity documents or publish recognizable people without appropriate permission. Entries must use simple local filenames such as `photos/portrait-01.webp`. Maximum 18 displayed photos. Both Arabic and Turkish versions will show the section once images are present.
