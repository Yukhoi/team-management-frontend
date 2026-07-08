# PDF Chinese Font

Place an open-source Simplified Chinese font here when text should be embedded as real PDF text.

Recommended file:

```text
NotoSansSC-Regular.ttf
```

The export engine first tries to load:

```text
/fonts/NotoSansSC-Regular.ttf
```

Do not commit commercial fonts or copied system fonts. If this font is not present, the browser export path renders Chinese text to PNG and embeds it into the PDF so test exports can still display Chinese names.
