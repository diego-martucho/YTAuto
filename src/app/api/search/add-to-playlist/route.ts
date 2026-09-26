import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getValidYouTubeAccessToken } from '@/lib/youtube/token';
import { addVideoToPlaylist } from '@/lib/youtube/api';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, playlistId } = body;

    if (!videoId || !playlistId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const accessToken = await getValidYouTubeAccessToken(session.user.id);
    await addVideoToPlaylist(accessToken, playlistId, videoId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding to playlist:', error);
    return NextResponse.json(
      { error: error.message || 'Error al agregar a la lista' },
      { status: 500 }
    );
  }
}
