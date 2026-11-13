-- Strand is no longer asked for in the portal; existing values are kept.
alter table public.assignments alter column strand drop not null;
