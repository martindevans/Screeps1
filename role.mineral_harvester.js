const bt = require("behaviourtree");
const bp = require("behaviourpaths");
const act = require("actions");

const bb_deposit_id = "deposit_id"
const bb_container_id = "container_id"

const tree = new bt.BehaviourTree(
    new bt.Sequence([

        // Keep mining the deposit until failure
        new bt.Repeat(
            new bt.Predicate(try_harvest)
        ),

        // Not in mining range, move
        new bt.If(
            bb => bb.harvest_result == ERR_NOT_IN_RANGE,
            new bt.Sequence([
                new bt.Say("Moving"),
                new bt.Predicate(bb => bp.setup_pathfind_to(bb, bb_container_id)),
                new bp.MoveTo()
            ])
        ),

        // Check if the deposit is empty, if it is suicide the harvester
        new bt.If(
            bb => bb.harvest_result == ERR_NOT_ENOUGH_RESOURCES,
            new bt.Predicate(act.suicide)
        ),

        // Extractor has been destroyed, if it has suicide the harvester and let the mining controller fix the problem
        new bt.If(
            bb => bb.harvest_result == ERR_NOT_FOUND,
            new bt.Predicate(act.suicide)
        ),

        // If it's invalid something has gone wrong. Sucide harvester?
        new bt.If(
            bb => bb.harvest_result == ERR_INVALID_TARGET,
            new bt.Sequence([
                new bt.Say("Invalid mineral harvester target!"),
                new bt.Predicate(act.suicide)
            ])
        ),
    ])
);

function try_harvest(blackboard)
{
    let creep = Game.creeps[blackboard.creep_name];
    let mineral = Game.getObjectById(blackboard[bb_deposit_id]);
    let container = Game.getObjectById(blackboard[bb_container_id]);

    // If the container is full that's a _success_ (we just need to wait)
    if (container.store.getFreeCapacity(mineral.mineralType) <= 0) {
        console.log("wait cont")
        blackboard.harvest_result = OK;
        return true;
    }

    if (!mineral) {
        bb.harvest_result = ERR_INVALID_TARGET;
        return false;
    }

    let result = creep.harvest(mineral);
    blackboard.harvest_result = result;

    if (result == 0) {
        return true;
    }

    // Consider hitting the cooldown a success - it's not a failure that can be corrected
    if (result == ERR_TIRED) {
        return true;
    }

    return false;
}

function run(creep)
{
    tree.tick(creep.memory.bt_state, creep.memory.bt_board);
}

module.exports = {
    run,

    bb_deposit_id,
    bb_container_id
}

