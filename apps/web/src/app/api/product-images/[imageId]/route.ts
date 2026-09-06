interface RouteContext {
  params: Promise<{ imageId: string }>;
}

export async function GET(_req: Request, ctx: RouteContext): Promise<Response> {
  const { imageId } = await ctx.params;
  const baseUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const url = `${baseUrl}/v1/product-images/${encodeURIComponent(imageId)}`;

  try {
    const upstream = await fetch(url, {
      next: { revalidate: 300 },
    });

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'image/webp');
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
