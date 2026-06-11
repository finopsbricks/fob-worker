import { listStations, getStation } from '../../utils/orchestrator.js';
import { saveStation, getStationsDir } from '../../utils/station-files.js';

/**
 * Convert dependency IDs to short_codes using a station map.
 * Values without a matching short_code pass through unchanged.
 * @param {string[]} dependencies
 * @param {Map<string, string>} idToShortCode - Map of station ID → short_code
 * @returns {string[]}
 */
function convertDependenciesToShortCodes(dependencies, idToShortCode) {
  if (!dependencies || dependencies.length === 0) return dependencies;
  return dependencies.map(dep => idToShortCode.get(dep) || dep);
}

export async function pullStationsHandler(argv) {
  const { id, all } = argv;

  // Require explicit id or --all
  if (!id && !all) {
    console.error('Usage: fob stations pull <id|short_code>');
    console.error('       fob stations pull --all');
    console.error('');
    console.error('Run "fob stations list" to see available stations');
    process.exit(1);
  }

  console.log(`Saving to: ${getStationsDir()}/`);

  try {
    if (id) {
      // Pull single station — also fetch list for dependency resolution
      const [response, allResponse] = await Promise.all([
        getStation(id),
        listStations(),
      ]);
      const station = response.data;
      const idToShortCode = new Map(
        (allResponse.data || []).filter(s => s.short_code).map(s => [s.id, s.short_code])
      );
      // Convert tag objects to names for local storage
      if (station.tags) {
        station.tags = station.tags.map(t => t.name);
      }
      station.dependencies = convertDependenciesToShortCodes(station.dependencies, idToShortCode);
      const filepath = saveStation(station);
      console.log(`Saved: ${filepath}`);
    } else {
      // Pull all stations
      const response = await listStations();
      const stations = response.data || [];

      if (stations.length === 0) {
        console.log('No stations found');
        return;
      }

      // Build ID → short_code map from the full list
      const idToShortCode = new Map(
        stations.filter(s => s.short_code).map(s => [s.id, s.short_code])
      );

      for (const station of stations) {
        // Fetch full details (list may not include all fields)
        const fullResponse = await getStation(station.id);
        const fullStation = fullResponse.data;
        if (fullStation.tags) {
          fullStation.tags = fullStation.tags.map(t => t.name);
        }
        fullStation.dependencies = convertDependenciesToShortCodes(fullStation.dependencies, idToShortCode);
        const filepath = saveStation(fullStation);
        console.log(`Saved: ${filepath}`);
      }

      console.log('');
      console.log(`Total: ${stations.length} stations pulled`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
