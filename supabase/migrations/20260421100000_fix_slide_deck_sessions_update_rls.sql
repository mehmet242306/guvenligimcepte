-- slide_deck_sessions_update politikasi onceden "using (true)" idi;
-- bu, authenticated herhangi bir kullanicinin baska organizasyonun
-- session kayitlarini guncellemesine izin veriyordu. Politikayi
-- session sahibi (viewer_id = auth.uid()) ya da deck organizasyonuna
-- uye olan kullanici ile sinirliyoruz.

drop policy if exists "slide_deck_sessions_update" on public.slide_deck_sessions;
create policy "slide_deck_sessions_update" on public.slide_deck_sessions for update
  using (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.slide_decks d
      where d.id = slide_deck_sessions.deck_id
        and d.organization_id = public.current_user_org_id()
    )
  )
  with check (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.slide_decks d
      where d.id = slide_deck_sessions.deck_id
        and d.organization_id = public.current_user_org_id()
    )
  );
