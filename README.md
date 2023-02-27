## What does Storage Cleaner do?

Storage cleaner is a tool to delete all your Storage types (Datasets, Key-Value storages and Request queues) on your Apify user account based on the amount of days since they were last accessed.

## Input parameters

You can either use the user-friendly UI in Apify Console to set up your actor or input it directly via JSON. Storage Cleaner recognizes these fields:

- `deleteAfterDays` - Sets the minimum limit value for Storages to be last accessed, otherwise they will be deleted.

- `forceDelete` - When unchecked/`false` it will only provide log of Storages that were filtered based on `deleteAfterDay` value. If checked/`true` - the storages will be really deleted.

- `storageType` - Type of storage to delete. Allowed values are:
  - `"DATASET"` - To delete only Dataset storages.
  - `"KEY_VALUE"` - To delete only Key-value storages.
  - `"REQUEST_QUEUE"` - To delete only Request queues.
  - `"ALL"` - To delete all previous mentioned.

Here are examples of the schema in JSON for the various types of input:

### Delete all Storages that were last accessed more than 1 week (7 days) ago:
```json
{
  "deleteAfterDays": 7,
  "forceDelete": true,
  "storageType": "ALL"
}
```

## Your feedback

We're always working on improving the performance of our actors. So if you've got any technical feedback on Storage Scraper, or simply **found a bug,** please create an issue on the actor's [Issues tab](https://console.apify.com/actors/todo#/issues) in Apify Console.
