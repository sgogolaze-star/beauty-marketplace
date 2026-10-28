-- PostgreSQL built-in SHA-256 binds every immutable text snapshot to its receipt hash.
alter table public.legal_documents add constraint legal_snapshot_hash_matches check(content_sha256=encode(sha256(convert_to(content_json,'UTF8')),'hex'));
create index legal_receipts_document_idx on public.legal_receipts(kind,version);
