const NodeRole = {
    // Node provides a resource and needs to get rid of it
    Source: 1,

    // Node consumes a resource and needs to be supplied with it
    Sink: 2,

    // Node can store resources
    Storage: 3,
};

function create_logistics_node(structure)
{

}

function assign_node_role(node, resource, role)
{

}

function find_pairs(room)
{

}

module.exports = {
    create_logistics_node,
    assign_node_role,
    
    find_pairs
}