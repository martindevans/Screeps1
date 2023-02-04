const roles = require("roles");

var roleClaimer =
{
    run: function(creep)
    {
        let flag = Game.flags[creep.memory.targetFlag];
        let ctrl = creep.room.controller;

        if(flag)
        {
            if (creep.room == flag.room)
            {
                let claim = creep.claimController(ctrl);

                if (claim == OK) {
                    setup_room(creep.room, creep);
                    creep.suicide();
                    flag.remove();
                }

                if (claim == ERR_NOT_IN_RANGE) {
                    creep.moveTo(ctrl, {visualizePathStyle: {stroke: '#cc00cc'}});
                }
            }
            else
            {
                creep.moveTo(flag, {visualizePathStyle: {stroke: '#cc00cc'}});
            }

        }
    }
};

function add_creep(room, role, name, override_pos = {})
{
    let body = roles[role.toUpperCase()];

    Memory.creeps[name] = {
        role: role.toLowerCase(),
        bt_state: {},
        bt_board: {
            creep_name: name,
            parent_room: room.name,
            body: body,
            override_pos: override_pos
        },
    }

    room.memory.creeps.push(name);
}

function setup_room(room, creep)
{
    room.memory.sponsor = creep.memory.sponsor;

    let n = 0;
    function name()
    {
        n++;
        return creep.name + "_sub_" + n;
    }

    let sources = room.find(FIND_SOURCES);
    for (let idx in sources) {
        let source = sources[idx];
        let pos = find_empty_adjacent(room, source.pos.x, source.pos.y);
        if (pos != null) {
            add_creep(room, "harvester", name(), {x:pos.x, y:pos.y});
        }
    }

    add_creep(room, "builder", name());
}

function find_empty_adjacent(room, pos_x, pos_y)
{
    for (let x = -1; x < 2; x++) {
        for (let y = -1; y < 2; y++) {
            if (Game.map.getTerrainAt(pos_x + x, pos_y + y, room.name) != "wall") {
                return { x: pos_x + x, y: pos_y + y };
            }
        }
    }

    return null;
}

module.exports = roleClaimer;