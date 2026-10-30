# LumenRAG 0.1.10

## Collections remain visible before indexing

Previously, the sidebar listed collections only when they had indexed document metadata. Typing a new collection name did not persist an empty collection.

- Add an explicit collection creation action and a collection selector in the sidebar, in English and Portuguese.
- Select newly created collections immediately and reset document filters and the session when switching collections.
- Persist logical collections in `rag_data/collections.json`, independently of indexed documents. Existing collections are still discovered from document metadata.
- Validate new names and make repeated creation idempotent. Write the registry using atomic replacement.
- Add regression coverage for empty collections, persistence across application instances, legacy discovery, duplicates and invalid names.

Upgrade: `python -m pip install --upgrade lumenrag==0.1.10`.

No reindexing is required. Existing vectors, chunk metadata, uploads and AI settings are not migrated or modified by this release. The pinned LumenVec engine is unchanged. Collections are logical LumenRAG groupings, not a new native engine API.

Rollback: reinstall 0.1.9. Older versions ignore `collections.json`, so empty collections will not be shown there until documents are indexed.
