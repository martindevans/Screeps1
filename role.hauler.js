const bt = require("behaviourtree");
const bp = require("behaviourpaths");
const act = require("actions");
const find = require("utils.find")

let tree = new bt.BehaviourTree(
    new bt.Selector([

        // If the creep has any non-energy resources chuck them into terminal/storage
        new bt.While(
            new bt.Predicate(blackboard => Object.keys(Game.creeps[blackboard.creep_name].store).length > 0),
            new bt.Sequence([
                //new bt.Predicate(bb => find.structure_with_space(bb, [STRUCTURE_TERMINAL])),
                new bt.Predicate(bp.setup_pathfind_to_find_id),
                new bp.MoveTo(do_delivery),
                new bt.Predicate(bb => find.structure_with_space(bb, [STRUCTURE_STORAGE])),
                new bt.Predicate(bp.setup_pathfind_to_find_id),
                new bp.MoveTo(do_delivery),
            ])
        ),

        // Find energy to collect
        new bt.While(
            new bt.Predicate(blackboard => Game.creeps[blackboard.creep_name].store.getFreeCapacity(RESOURCE_ENERGY) > 0),
            new bt.Sequence([
                new bt.Random([
                    new bt.Predicate(find.tombstone),
                    new bt.Predicate(find.dropped_resources),
                    new bt.Predicate(bb => find.structure_with_resource(bb, [STRUCTURE_CONTAINER], null, null, find.Mode.Random))
                ]),
                new bt.Predicate(bp.setup_pathfind_to_find_id),
                new bp.MoveTo(bb => act.pickup(bb) != ERR_NOT_IN_RANGE)
            ])
        ),

        // Find somewhere to put energy
        new bt.While(
            new bt.Predicate(blackboard => Game.creeps[blackboard.creep_name].store.getUsedCapacity(RESOURCE_ENERGY) > 0),
            new bt.Sequence([
                new bt.Selector([
                    new bt.Predicate(bb => find.structure_with_space(bb, [STRUCTURE_TOWER], RESOURCE_ENERGY, 500)),
                    new bt.Predicate(bb => find.structure_with_space(bb, [STRUCTURE_TOWER, STRUCTURE_EXTENSION, STRUCTURE_SPAWN], RESOURCE_ENERGY)),
                    //new bt.Predicate(bb => find.structure_with_requirement(bb, [STRUCTURE_TERMINAL], RESOURCE_ENERGY, 50000)),
                    new bt.Predicate(bb => find.structure_with_space(bb, [STRUCTURE_STORAGE], RESOURCE_ENERGY))
                ]),
                // new bt.Predicate(bb => {
                //     let obj = Game.getObjectById(bb.find_id) != null;
                //     return obj != null && obj.store != null;
                // }),
                new bt.Predicate(bp.setup_pathfind_to_find_id),
                new bp.MoveTo(do_delivery),
            ])
        )
    ])
);

function do_delivery(blackboard)
{
    let creep = Game.creeps[blackboard.creep_name];
    let object = Game.getObjectById(blackboard.find_id);

    let is_terminal = object.structureType == STRUCTURE_TERMINAL;

    // Try to get rid of every resource the creep is holding
    let success = false;
    for (key in creep.store)
    {
        // Don't put something into the terminal unless it's marked for export
        if (is_terminal && object.room.memory.bt_board.exports == null) {
            continue;
        }
        if (key != RESOURCE_ENERGY && is_terminal && object.room.memory.bt_board.exports.indexOf(key) == -1) {
            continue;
        }

        if (object.store.getCapacity(key) > 0) {
            let trans = creep.transfer(object, key);
            success = success | (trans != ERR_NOT_IN_RANGE);
        }
    }

    return success;
}

const roleHauler =
{
    run: function(creep)
    {
        tree.tick(creep.memory.bt_state, creep.memory.bt_board);
    }
};

module.exports = roleHauler;