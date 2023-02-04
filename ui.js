module.exports.spawn = function(role, roomName)
{
    // Get the room which will own this creep
    let ownerRoom = Game.rooms[roomName];

    // If the room has a sponsor spawn in there instead
    let spawnRoom = ownerRoom;
    if (spawnRoom.memory.sponsor) {
        spawnRoom = Game.rooms[spawnRoom.memory.sponsor];
    }

    // Find the spawner
    let spawn = spawnRoom.find(FIND_MY_SPAWNS)[1];
    let extensions = spawnRoom.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_EXTENSION }
    });
    _.shuffle(extensions);
    extensions.push(spawn);

    // Determine the body to use
    let roles = [MOVE, CARRY, WORK];

    if (role == "harvester") {
        roles = [MOVE, CARRY, WORK, WORK, WORK, WORK, WORK]
    }
    if (role == "builder") {
        roles = [
            MOVE,  MOVE,  MOVE, MOVE, MOVE,
            CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
            WORK,  WORK,  WORK,  WORK,  WORK,  WORK
        ]
    }
    if (role == "hauler") {
        roles = [
            MOVE,  MOVE,  MOVE,  MOVE,  MOVE,  MOVE,  MOVE,  MOVE,  MOVE,  MOVE,
            CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY
        ]
    }

    let name = "Worker" + Game.time;
    let result = spawn.spawnCreep(roles, "Worker" + Game.time, {
        memory: {
            role: role,
            bt_state: {},
            bt_board: {
                creep_name: name,
                parent_room: roomName,
                body: roles,
                override_pos:{x:46,y:38}
            },
        },
        energyStructures: extensions
    });

    if (result == 0) {
        ownerRoom.memory.creeps.push(name);
    }

    return result;
}

module.exports.spawn2 = function(role, roomName, override_pos = {})
{
    let roles = require("roles");
    let body = roles[role.toUpperCase()];
    let name = "Worker" + Game.time;

    Memory.creeps[name] = {
        role: role.toLowerCase(),
        bt_state: {},
        bt_board: {
            creep_name: name,
            parent_room: roomName,
            body: body,
            override_pos: override_pos
        },
    }

    Game.rooms[roomName].memory.creeps.push(name);

    return name;
}

module.exports.unregister = function(name)
{
    let creep_memory = Memory.creeps[name];
    let room = creep_memory.bt_board.parent_room;
    let creeps = Memory.rooms[room].creeps;

    const idx = creeps.indexOf(name);
    if (idx >= 0) {
        creeps.splice(idx, 1);
        console.log("Removed");
    } else {
        console.log("Not Found In Room");
    }
}

module.exports.spawn_claim = function(flag, spawn)
{
    var spawn = Game.spawns[spawn];

    let extensions = spawn.room.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_EXTENSION }
    });
    extensions.push(spawn);

    let roles = [MOVE, MOVE, CLAIM];

    return spawn.spawnCreep(roles, "Claimer" + Game.time, {
        memory: { role: "claimer", targetFlag:flag, sponsor: spawn.room.name },
        energyStructures: extensions
    });
}

// module.exports.vacuum = function()
// {
//     let count = 0;
//     for (key in Memory.creeps)
//     {
//         if (key.includes("MineralHarvester") || key.includes("Claimer"))
//         {
//             count++;
//             delete Memory.creeps[key];
//         }
//     }

//     return count;
// }

module.exports.sponsors = function()
{
    Game.map.visual.clear();

    let count = 0;
    for (let idx in Game.rooms)
    {
        let room = Game.rooms[idx];

        if (room.memory.sponsor) {
            let sponsor = Game.rooms[room.memory.sponsor];

            let a = room.getPositionAt(25, 25);
            let b = sponsor.getPositionAt(25, 25);
            Game.map.visual.line(a, b, {
                color: '#ff0000',
                lineStyle:
                'dashed'
            });
            count++;
        }
    }

    Memory.map_visuals = Game.map.visual.export();
    return count;
}

module.exports.redefine_body = function(creepName)
{
    let roles = require("roles");

    let mem = Game.creeps[creepName].memory;
    let bb = mem.bt_board;
    let role = mem.role;

    let body2 = roles[role.toUpperCase()];
    bb.body = body2;

    return body2;
}

module.exports.upkeep = function(roomName)
{
    const ROAD_UPKEEP = ROAD_DECAY_AMOUNT / REPAIR_POWER / ROAD_DECAY_TIME;
    const ROAD_UPKEEP_SWAMP = (ROAD_DECAY_AMOUNT * CONSTRUCTION_COST_ROAD_SWAMP_RATIO) / REPAIR_POWER / ROAD_DECAY_TIME;
    const ROAD_UPKEEP_TUNNEL = (ROAD_DECAY_AMOUNT * CONSTRUCTION_COST_ROAD_WALL_RATIO) / REPAIR_POWER / ROAD_DECAY_TIME;
    const CONTAINER_UPKEEP = CONTAINER_DECAY / REPAIR_POWER / CONTAINER_DECAY_TIME_OWNED;
    const RAMPART_UPKEEP = RAMPART_DECAY_AMOUNT / REPAIR_POWER / RAMPART_DECAY_TIME;

    let room = Game.rooms[roomName];
    let structures = room.find(FIND_STRUCTURES);

    let upkeep = {}
    function u(type, cost) {
        upkeep[type] = Number(upkeep[type] || 0) + cost;
    }

    structures.forEach((structure) => {
        switch (structure.structureType)
        {
            
            // 5000 on plain land
            // 25000 on swamp
            // 750000 on walls
            case "road":
                if (structure.hitsMax == 5000) {
                    u("road", ROAD_UPKEEP);
                } else if (structure.hitsMax == 25000) {
                    u("road_swamp", ROAD_UPKEEP_SWAMP);
                } else if (structure.hitsMax == 750000) {
                    u("road_tunnel", ROAD_UPKEEP_TUNNEL);
                }
                break;

            case "container":
                u("container", CONTAINER_UPKEEP);
                break;
            
            case "rampart":
                u("rampart", RAMPART_UPKEEP);
                break;

            case "extension":
            case "storage":
            case "tower":
            case "terminal":
            case "spawn":
            case "controller":
                break;

            default:
                console.log("Unknown: " + structure.structureType);
        }
    });

    let totalUpkeep = Object.values(upkeep).reduce((a, b) => a + b, 0);
    console.log("Upkeep: " + totalUpkeep);

    const sorted = Object.entries(upkeep)
        .sort(([,a],[,b]) => b-a)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

    console.log("Breakdown: " + JSON.stringify(sorted))
}

module.exports.help = function()
{
    for (let key in module.exports) {
        console.log(key);
    }
}