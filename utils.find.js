const Mode = {
    Random: 0,
    Closest: 1
};
const FindId = "find_id";

// Find a random pile of dropped resources in the room
function dropped_resources(blackboard, mode = Mode.Random)
{
    let creep = Game.creeps[blackboard.creep_name];

    var sources = creep.room.find(FIND_DROPPED_RESOURCES);
    if (sources.length == 0) {
        return false;
    }

    let source = choose_item(creep.pos, sources, mode);
    blackboard.pickup_type = "pickup";
    blackboard.find_id = source.id;
    return true;
}

// Find a pile of resource directly adjacent to the creep
function adjacent_dropped_resource(blackboard, resource)
{
    let creep = Game.creeps[blackboard.creep_name];

    let items = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, item => item.store[resource] > 0);
    if (items.length == 0) {
        return false;
    }

    let item = choose_item(creep.pos, items, Mode.Random);
    blackboard.pickup_type = "pickup";
    blackboard.find_id = item.id;
    return true;
}

// Find a tombstone
function tombstone(blackboard, mode = Mode.Closest)
{
    let creep = Game.creeps[blackboard.creep_name];

    let sources = creep.room.find(FIND_TOMBSTONES);
    if (sources.length == 0) {
        return false;
    }

    let source = choose_item(creep.pos, sources, mode);
    blackboard.pickup_type = "withdraw";
    blackboard.find_id = source.id;
    return true;
}

// Find a structure with the given resources available
function structure_with_resource(blackboard, structureTypes, resource, threshold, mode = Mode.Closest)
{
    let creep = Game.creeps[blackboard.creep_name];

    let sources = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => _.contains(structureTypes, structure.structureType) && (resource == null || structure.store.getUsedCapacity(resource) > (threshold || 0))
    });
    if (sources.length == 0) {
        return false;
    }

    let source = choose_item(creep.pos, sources, mode);
    //let source = sources[Math.floor(Math.random() * sources.length)];
    blackboard.pickup_type = "withdraw";
    blackboard.find_id = source.id;
    return true;
}

// Find a structure with space to store the given resource
function structure_with_space(blackboard, structureTypes, resource, threshold, mode = Mode.Closest)
{
    let creep = Game.creeps[blackboard.creep_name];

    let sources = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => _.contains(structureTypes, structure.structureType) && (resource == null || structure.store.getFreeCapacity(resource) > (threshold || 0))
    });
    if (sources.length == 0) {
        return false;
    }

    let source = choose_item(creep.pos, sources, mode);
    blackboard.pickup_type = "withdraw";
    blackboard.find_id = source.id;
    return true;
}

// Find a structure with less than a given required amount of resource
function structure_with_requirement(blackboard, structureTypes, resource, required, mode = Mode.Closest)
{
    let creep = Game.creeps[blackboard.creep_name];

    let sources = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => _.contains(structureTypes, structure.structureType) && structure.store.getUsedCapacity(resource) < required
    });
    if (sources.length == 0) {
        return false;
    }

    let source = choose_item(creep.pos, sources, mode);
    blackboard.pickup_type = "withdraw";
    blackboard.find_id = source.id;
    return true;
}

function construction_sites(blackboard, mode = Mode.Closest)
{
    let creep = Game.creeps[blackboard.creep_name];

    var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (targets.length == 0) {
        return false;
    }

    let tgt = choose_item(creep.pos, targets, mode);
    blackboard.find_id = tgt.id;
    return true;
}

function room_controller(blackboard)
{
    let creep = Game.creeps[blackboard.creep_name];
    let tgt = creep.room.controller
    blackboard.find_id = tgt.id;
    return true;
}

// Find an energy source, next to `bb.override_pos` if it is defined
function energy_source(blackboard, mode = Mode.Closest)
{
    let creep = Game.creeps[blackboard.creep_name];

    var sources = creep.room.find(FIND_SOURCES);
    if (sources.length == 0) {
        return false;
    }

    let ov = creep.memory.bt_board.override_pos;
    if (ov)
    {
        for (let idx in sources)
        {
            let src = sources[idx];
            if (src.pos.isNearTo(ov.x, ov.y)) {
                let tgt = src;
                blackboard.find_id = tgt.id;
                return true;
            }
        }
    }
    else
    {
        let tgt = choose_item(creep.pos, sources, mode);
        blackboard.find_id = tgt.id;
        return true;
    }
    
    return false;
}

function choose_item(creep_pos, items, mode)
{
    switch (mode)
    {
        case Mode.Closest: {
            let best_dist = Infinity;
            let best_item = null;
            for (var idx in items) {
                let item = items[idx];
                let pos = item.pos;
                let dist = Math.pow(pos.x - creep_pos.x, 2) + Math.pow(pos.y - creep_pos.y, 2);
                if (dist < best_dist) {
                    best_dist = dist;
                    best_item = item;
                }
            }
            return best_item;
        }

        default:
        case Mode.Random: {
            return items[Math.floor(Math.random() * items.length)]
        }
    }
}

module.exports = {
    Mode,
    FindId,

    dropped_resources,
    adjacent_dropped_resource,

    tombstone,
    structure_with_resource,
    structure_with_space,
    structure_with_requirement,

    energy_source,

    construction_sites,
    room_controller,
}