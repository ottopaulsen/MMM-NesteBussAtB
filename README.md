# NesteBussAtB

Modul til MagicMirror som viser hvor mange minutter det er til neste buss til hver destinasjon fra utvalgte holdeplasser går. Plukk ut aktuelle holdeplasser i nærheten. Finn holdeplassenes holdeplassnummer på AtB sin [holdeplassoversikt](https://www.atb.no/holdeplassoversikt/). Legg disse inn i `config.js` som beskrevet nedenfor (stopIds).

## Konfigurasjon

Dette er default-konfigurasjon med forklaring (skal inn i MagicMirror sin `config.js`:

```json
        {
            module: 'MMM-NesteBussAtB',
            position: 'upper_third',
            config: {
                showIcon: true, // Bus icon in front of row
                showNumber: true, // Bus number
                showFrom: true, // Bus stop name
                showTo: true, // Bus destination
                showMin: true, // "min" text after minutes
                size: "medium", // Text size, for exampla small, medium or large
                stopIds: [16011496, 16010496], // See https://www.atb.no/holdeplassoversikt/
                maxCount: 2, // Max number of next buses per route
                maxMinutes: 45 // Do not show buses more then this minutes into the future
            }
        }
```
