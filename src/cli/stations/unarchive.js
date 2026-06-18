import { getStation, unarchiveStation } from '../../utils/orchestrator.js';

export async function unarchiveStationHandler(argv) {
  const { id } = argv;

  try {
    const stationResponse = await getStation(id);
    const station = stationResponse.data;

    if (!station.archived_at) {
      console.log(`Station ${station.short_code || station.id} is not archived. No action taken.`);
      return;
    }

    await unarchiveStation(station.id);
    console.log(`Unarchived station ${station.short_code || station.id}.`);

    if (station.schedule_cron) {
      console.log('');
      console.log(`Note: schedule_enabled is still false — unarchive does not auto-resume the cron.`);
      console.log(`To resume scheduled execution:`);
      console.log(`  fob stations edit ${station.short_code || station.id} ... # (or PUT schedule_enabled=true)`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
