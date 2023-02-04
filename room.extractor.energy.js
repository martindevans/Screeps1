const bt = require("behaviourtree");
const sp = require("room.respawn")

let tree = new bt.BehaviourTree(
    new bt.Sequence([

        // Check that the deposit is not empty
        new bt.Predicate(check_deposit),

        // Find an adjacent container or build one
        new bt.Selector([
            new bt.Predicate(find_adjacent_container),
            new bt.Sequence([
                new bt.Predicate(construct_container),
                new bt.Repeat(
                    new bt.Predicate(wait_for_construction),
                ),
                new bt.Success("Finished Constructing Container"),
            ])
        ]),

        // Create a mining drone if there isn't one
        new bt.Selector([
            new bt.Predicate(find_mineral_harvester),
            new bt.Predicate(spawn_mineral_harvester)
        ]),

        //new bt.Log("Waiting to recheck extraction"),
        new bt.Wait(30),
    ]),
)

function check_deposit(blackboard)
{
    const deposit = Game.getObjectById(blackboard.deposit);
    return deposit.mineralAmount > 0;
}

function find_adjacent_container(blackboard)
{
    const deposit = Game.getObjectById(blackboard.deposit);
    const pos = deposit.pos;

    const containers = pos.findInRange(FIND_STRUCTURES, 1, {
        filter: { structureType: STRUCTURE_CONTAINER }
    });

    if (containers.length == 0) {
        delete blackboard.container_id;
        return false;
    }

    blackboard.container_id = containers[0].id;
    return true;
}

function construct_container(blackboard)
{
    const deposit = Game.getObjectById(blackboard.deposit);
    const pos = deposit.pos;
    const room = Game.rooms[pos.roomName];

    // First check that there isn't already a construction site
    let sites = pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
        filter: { structureType: STRUCTURE_CONTAINER }
    });
    if (sites.length > 0) {
        blackboard.construction_id = sites[0].id;
        return true;
    }

    // Find a place to put the container
    let sitePos = find_construction_site(room, pos, STRUCTURE_CONTAINER);
    if (!sitePos) {
        return false;
    }

    // Get the site
    sites = creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, sitePos.x, sitePos.y);
    if (sites.length == 0) {
        return false;
    }

    // Store ID
    blackboard.construction_id = sites[0].id;
    return true;
}

function find_construction_site(room, pos, type)
{
    for (let x = -1; x < 2; x++) {
        for (let y = -1; y < 2; y++) {
            let r = room.createConstructionSite(pos.x + x, pos.y + y, type);
            if (r == 0) {
                return { x: pos.x + x, y: pos.y + y };
            }
        }
    }

    return null;
}

function find_extractor(blackboard)
{
    const deposit = Game.getObjectById(blackboard.deposit);
    const pos = deposit.pos;

    const extractors = pos.findInRange(FIND_STRUCTURES, 1, {
        filter: { structureType: STRUCTURE_EXTRACTOR }
    });

    if (extractors.length == 0) {
        delete blackboard.extractor_id;
        return false;
    }

    blackboard.extractor_id = extractors[0].id;
    return true;
}

function construct_extractor(blackboard)
{
    const deposit = Game.getObjectById(blackboard.deposit);
    const pos = deposit.pos;
    const room = Game.rooms[pos.roomName];

    console.log("Looking for extractor")

    // First check that there isn't already a construction site
    let sites = pos.lookFor(FIND_CONSTRUCTION_SITES);
    if (sites.length > 0) {
        for (let idx in sites) {
            let site = sites[idx];
            if (site.structureType == STRUCTURE_EXTRACTOR) {
                blackboard.construction_id = site.id;
                return true;
            }
        }
    }

    console.log("placing extractor");

    // Find a place to put the container
    let result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_EXTRACTOR);
    if (result != 0) {
        return false;
    }

    // Get the site
    sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, sitePos.x, sitePos.y);
    if (sites.length == 0) {
        return false;
    }

    // Store ID
    blackboard.construction_id = sites[0].id;
    return true;
}

function wait_for_construction(blackboard)
{
    return (blackboard.construction_id in Game.constructionSites);
}

function find_mineral_harvester(blackboard)
{
    const deposit = Game.getObjectById(blackboard.deposit);
    const pos = deposit.pos;
    const room = Game.rooms[pos.roomName];

    let harvesters = room.find(FIND_MY_CREEPS, {
        filter: creep => creep.memory.role == "mineral_harvester"
    });

    if (harvesters.length == 0) {
        return false;
    }

    blackboard.harvester_id = harvesters[0].id;
    return true;
}

function spawn_mineral_harvester(blackboard)
{
    const deposit = Game.getObjectById(blackboard.deposit);
    const pos = deposit.pos;
    const room = Game.rooms[pos.roomName];

    [spawn, extensions] = sp.get_spawner(room, false);
    if (spawn == null) {
        return false;
    }

    const name = "MineralHarvester" + Game.time;
    let memory = {
        role: "mineral_harvester",
        bt_board: {
            [hv.bb_deposit_id]: blackboard.deposit,
            [hv.bb_container_id]: blackboard.container_id,
            body: [MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK]
        }
    };

    let result = sp.try_spawn(spawn, extensions, memory, name);
    console.log("Extractor spawn result: " + result);
    return result == 0;
}

function survey(room)
{
    var minerals = room.find(FIND_MINERALS);

    let survey = [];
    for (let idx in minerals)
    {
        let deposit = minerals[idx];
        survey.push({
            id: deposit.id,
            mineralType: deposit.mineralType
        });
    }

    room.memory.bt_board.survey = survey;
    room.memory.bt_board.minerals_surveyed = true;
    console.log("Completed Mineral Survey: " + room.name);
}

const roomExtractor =
{
    extract: function(room)
    {
        //todo: mineral harvesting disabled
        return;

        if (room.controller.level < 6) {
            return;
        }

        if (!room.memory.bt_board.minerals_surveyed) {
            survey(room);
        }

        const surveyResult = room.memory.bt_board.survey;
        for (let idx in surveyResult)
        {
            const item = surveyResult[idx];
            const deposit = Game.getObjectById(item.id);
            if (!deposit) {
                continue;
            }

            // Get or create a behaviour tree state for this deposit
            item.bt_state = item.bt_state || {};
            item.bt_board = item.bt_board || {};
            item.bt_board.deposit = item.id;
            tree.tick(item.bt_state, item.bt_board);
        }
    }
};

module.exports = roomExtractor;