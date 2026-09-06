// app/admin/homepage-banner/page.tsx
import { requireAdmin } from '@/lib/admin/guard';
import { HomepageBannerManager } from '@/components/admin/HomepageBannerManager';

export default async function HomepageBannerPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('homepage_banner').select('*').eq('id', 1).single();

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Homepage Banner</h1>
      <HomepageBannerManager initial={data ?? { image_url: null, caption: null, link_url: null }} />
    </div>
  );
}
