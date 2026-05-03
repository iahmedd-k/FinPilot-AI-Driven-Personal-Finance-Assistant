const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  events: [{
    type: { type: String },
    details: Schema.Types.Mixed
  }]
});

const Model = mongoose.model('Test', schema);

const doc = new Model({
  events: [{ type: "test", details: { age: 30 } }]
});

console.log("Before:", doc.events[0].details);

doc.events = [{ type: "test2", details: { age: 40 } }];

console.log("After:", doc.events[0].details);
