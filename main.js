const roleHarvester = require('role.harvester');
const roleBuilder = require('role.builder');
const roleHauler = require('role.hauler');
const roleClaimer = require('role.claimer');
const roleMineralHarvester = require('role.mineral_harvester')
const tower = require('tower');
const roomManager = require("room.manager");

console.log("Loading")

module.exports.loop = function()
{
    try {
        tower.run();
    } catch (e) {
        console.log(e)
    }

    Game.map.visual.import(Memory.map_visuals);

    for (var name in Game.rooms)
    {
        try
        {
            let room = Game.rooms[name];
            let memory = room.memory;
            memory.creeps = memory.creeps || [];
            memory.bt_state = memory.bt_state || {};
            memory.bt_board = memory.bt_board || { room_name: name };
            roomManager.run(room);
        }
        catch (ex)
        {
            console.log(ex);
            console.log(ex.stack);
        }
    }

    for(var name in Game.creeps)
    {
        try
        {
            var creep = Game.creeps[name];
            let memory = creep.memory;
            memory.bt_state = memory.bt_state || {};
            memory.bt_board = memory.bt_board || {};
            memory.bt_board.creep_name = creep.name;

            if (try_renew(creep))
            {
                creep.say("♻ renewing")
                continue;
            }

            if (memory.bt_board.parent_room && creep.pos.roomName != memory.bt_board.parent_room) {
                let controller = Game.rooms[memory.bt_board.parent_room].controller;
                creep.moveTo(controller, {visualizePathStyle: {stroke: '#cc00cc'}});
                continue;
            }

            if(creep.memory.role == 'harvester')
            {
                roleHarvester.run(creep);
                continue;
            }
            if(creep.memory.role == 'mineral_harvester')
            {
                roleMineralHarvester.run(creep);
                continue;
            }
            if(creep.memory.role == 'builder')
            {
                roleBuilder.run(creep);
                continue;
            }
            if(creep.memory.role == 'hauler')
            {
                roleHauler.run(creep);
                continue;
            }
            if(creep.memory.role == 'claimer')
            {
                roleClaimer.run(creep);
                continue;
            }
        }
        catch (ex)
        {
            console.log(ex);
            console.log(ex.stack);
        }
    }
}

function try_renew(creep)
{
    return false;

    if (creep.room.controller.level >= 6) {
        return false;
    }

    if (creep.ticksToLive < 200 || creep.memory.renewing)
    {
        var targets = creep.room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_SPAWN);
            }
        });
    
        if (targets.length == 0) {
            return false;
        }

        creep.memory.renewing = true;
        
        var tgt = targets[0];
        creep.transfer(tgt, RESOURCE_ENERGY);
        let result = tgt.renewCreep(creep);

        if (result == ERR_NOT_IN_RANGE) {
            creep.moveTo(tgt);
        }
        if (result == ERR_FULL || result == ERR_NOT_ENOUGH_ENERGY) {
            creep.memory.renewing = false;
            return true;
        }

        return true;
    }

    return false;
}