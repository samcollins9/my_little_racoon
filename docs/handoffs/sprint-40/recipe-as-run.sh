npx supabase start   # local stack (~30-90s)
npx supabase db reset   # rebuild the local database from every migration
export $(npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
  | grep -E '^(NEXT_PUBLIC_SUPABASE_(URL|ANON_KEY)|SUPABASE_SERVICE_ROLE_KEY)=' \
  | tr -d '"')
npm run test:rls     # vitest run --config vitest.rls.config.ts (~2s)
npx supabase stop    # when you're done
