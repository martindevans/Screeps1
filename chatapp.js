const { try_send } = require("./_libnet");

net = require("_libnet")

outgoing = [];
contacts = [];
contact_index = 0;
contact_timer = 0;

function send(destination, message)
{
    add_contact(destination);
    outgoing.push([destination, message]);
}

function recv()
{
    // If there are no contacts do nothing
    if (contacts.length == 0) {
        return;
    }

    // Switch to the next contact after a short amount of time
    contact_timer++;
    if (contact_timer > 5) {
        contact_index++;
        contact_index = contact_index % contacts.length;
    }

    const activeContact = contacts[contact_index];

    // Find a packet for the active contact
    let outIdx = outgoing.findIndex(el => el[0] == activeContact);
    if (outIdx != -1) {
        let packet = outgoing[outIdx];

        // Try to send it
        if (try_send(activeContact, packet[1])) {
            outgoing.splice(outIdx, 1);
        }
    }

    // Try to receive a packet from the active contact
    let received = try_receive(contacts[contact_index]);
    if (!received) {
        return;
    }

    return {
        from: activeContact,
        message: received
    };
}

function add_contact(username)
{
    if (contacts.indexOf(username) == -1) {
        contacts.push(username);
    }
}

module.exports = {
    send,
    recv,
    add_contact,
};