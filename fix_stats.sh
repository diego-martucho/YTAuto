sed -i 's/userSettings,//g' src/app/api/dashboard/stats/route.ts
sed -i 's/syncLogs,/syncLogs,\n  userSettings,/' src/app/api/dashboard/stats/route.ts
