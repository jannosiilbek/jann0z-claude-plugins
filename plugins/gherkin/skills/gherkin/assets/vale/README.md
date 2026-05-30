# Optional Vale style

Lints `.feature` prose for ubiquitous-language consistency (one concept = one word),
banned-term substitution, and tense/voice. Optional — `review.md` Pass 4 works without it.

## Use

1. Install Vale: https://vale.sh
2. Point a `.vale.ini` at this folder as a `StylesPath` and enable the `Gherkin` style:

   ```ini
   StylesPath = plugins/gherkin/skills/gherkin/assets/vale
   [*.feature]
   Gherkin.Terminology = YES
   ```

3. Edit `Gherkin/Terminology.yml` `swap:` entries to match your project glossary.
