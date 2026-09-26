import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getValidYouTubeAccessToken } from '@/lib/youtube/token';
import { searchVideos } from '@/lib/youtube/api';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const channelId = searchParams.get('channelId') || undefined;

    if (!q) {
      return NextResponse.json({ error: 'La consulta de búsqueda es requerida' }, { status: 400 });
    }

    const accessToken = await getValidYouTubeAccessToken(session.user.id);
    const results = await searchVideos(accessToken, q, channelId);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      { error: error.message || 'Error al buscar videos' },
      { status: 500 }
    );
  }
}
