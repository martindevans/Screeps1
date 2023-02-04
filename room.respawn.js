function respawn(room)
{
    let verbose = false;
    //verbose = room.name == "W15S9";

    let name = pick_respawn(room);
    if (!name) {
        if (verbose) {
            console.log("no spawn needed");
        }
        return;
    }

    try
    {        
        if (verbose) {
            console.log("Respawning Creep: " + name);
        }
        let creep_memory = Memory.creeps[name];

        [spawn, extensions] = get_spawner(room, false);
        if (verbose) {
            console.log(" + Spawner (no follow): " + spawn + " " + room.name);
        }
        let result = try_spawn(spawn, extensions, creep_memory, name);

        // If the spawn is busy try again later
        if (result == ERR_BUSY) {
            if (verbose) {
                console.log(" + Busy!");
            }
            return;
        }

        // If this room doesn't have enough energy/RCL try the sponsor
        if (result == ERR_NOT_ENOUGH_ENERGY || result == ERR_RCL_NOT_ENOUGH)
        {
            if (room.memory.sponsor == null) {
                if (verbose) {
                    console.log(" + Not enough energy (no sponsor)");
                }
                return;
            }
            
            [spawn, extensions] = get_spawner(room, true);
            result = try_spawn(spawn, extensions, creep_memory, name, true);
        }

        if (verbose) {
            console.log(" + Result: " + result)
        }

        // If the spawn is busy try again later
        if (result == ERR_BUSY) {
            if (verbose) {
                console.log(" + Respawn later (busy)")
            }

            return;
        }

        // If there's no energy try again later
        if (result == ERR_NOT_ENOUGH_ENERGY) {
            if (verbose) {
                console.log(" + Not enough energy!")
            }
            console.log(room.name + " " + cost + " " + name);
            return;
        }

        // Early exit if it fails, try again later
        if (result != 0) {
            console.log("Unknown Spawn Failure: " + result + " (" + room.name + ")");
            return true;
        }

        if (result == 0) {
            if (verbose) {
                console.log(" + Respawn Success!")
            }
        }
    }
    catch (ex)
    {
        console.log("RESPAWN FAILURE: " + ex);
        console.log(ex.stack);

        //let idx = room.memory.creeps.indexOf(name);
        //room.memory.creeps.splice(idx, 1);
    }
}

function try_spawn(spawner, extensions, creep_memory, name, additional_move_parts)
{
    if (spawner == null) {
        return ERR_NOT_ENOUGH_ENERGY;
    }

    let body = [...creep_memory.bt_board.body];

    if (additional_move_parts)
    {
        // Count up how much non-move this creep has
        let nonMove = 0;
        for (let idx in body) {
            let part = body[idx];
            if (part == MOVE) {
                nonMove--;
            } else if (part == CARRY) {
                nonMove += 0.5;
            } else {
                nonMove += 1;
            }
        }

        // Add enough new move parts to balance out
        for (let i = 0; i < nonMove; i++) {
            body.push(MOVE);
        }
    }

    body = body.slice(0, 50);

    return spawner.spawnCreep(body, name, {
        memory: {
            bt_state: {},
            bt_board: creep_memory.bt_board,
            role: creep_memory.role,
        },
        energyStructures: extensions
    });
}

function get_spawner(room, follow_sponsor)
{
    if (follow_sponsor)
    {
        // Find the room to spawn this creep in
        if (room.memory.sponsor) {
            room = Game.rooms[room.memory.sponsor];
        }
    }

    // Find all spawns and pick one that's not busy
    let spawns = room.find(FIND_MY_SPAWNS);
    let spawn = spawns[0];
    if (spawns.length > 0 && spawn.spawning) {
        for (let idx in spawns) {
            let item = spawns[idx];
            if (!item.spawning) {
                spawn = item;
                break;
            }
        }
    }

    // Use all extensions
    let extensions = room.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_EXTENSION }
    });
    _.shuffle(extensions);
    extensions.push(spawn);

    return [spawn, extensions];
}

function pick_respawn(room)
{
    for (let idx in room.memory.creeps)
    {
        let name = room.memory.creeps[idx];
        if (!Game.creeps[name])
            return name;
    }
}

function creep_cost(parts)
{
    var totalCost = 0;
    parts.forEach(part => {
        totalCost += (BODYPART_COST[part.toLowerCase()])
    });
    return totalCost;
}

module.exports = {
    respawn: respawn,

    get_spawner,
    try_spawn
}