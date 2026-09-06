// app/admin/homepage-banner/page.tsx
import { requireAdmin } from '@/lib/admin/guard';
import { HomepageBannerManager } from '@/components/admin/HomepageBannerManager';

export default async function HomepageBannerPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('homepage_banners')
    .select('id, image_url, caption, link_url')
    .order('sort_order');

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Homepage Banner</h1>
      <HomepageBannerManager initial={data ?? []} />
    </div>
  );
}
