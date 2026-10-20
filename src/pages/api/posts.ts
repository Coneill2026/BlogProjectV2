import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

function createResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog');

  const mappedPosts = posts
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map((post) => ({
      id: post.id,
      slug: post.id,
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate.toISOString(),
      updatedDate: post.data.updatedDate?.toISOString() ?? null,
      author: post.data.author ?? null,
      url: `/blog/${post.id}/`,
    }));

  return createResponse(200, {
    count: mappedPosts.length,
    posts: mappedPosts,
  });
};
