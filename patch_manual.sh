sed -i 's/addVideoToPlaylist, getPlaylistVideoIds }/addVideoToPlaylist, getPlaylistVideoIds, getVideoDurations }/' src/app/api/sync/manual/route.ts
sed -i 's/excludeValue: channelRules.excludeValue,/excludeValue: channelRules.excludeValue,\n          includeShorts: channelRules.includeShorts,/' src/app/api/sync/manual/route.ts
