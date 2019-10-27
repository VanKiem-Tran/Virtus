

import React, { Component } from 'react';
import './Chat.css';
import Messages from "./Messages";
import Input from "./Input";
import {fdb, db} from "../db";

class Chat extends Component {
  state = {
    messages: [],
    currentUser: null
  };

  onSendMessage = (message) => {
      console.log(message);
    fdb.collection("messages")
        .add({
          office_hour: this.props.officeHourID,
          text: message,
          time_created: new Date(),
          user: this.state.currentUser.uid
        })
  };

  componentDidMount() {
    db.auth().onAuthStateChanged((user) => {
      this.setState({currentUser: user});
    });

    fdb.collection("messages")
        .where("office_hour", "==", this.props.officeHourID)
        .orderBy("time_created")
        .onSnapshot(querySnapshot => {
          const orderedMessages = querySnapshot.docs.map(doc => {
            return {id: doc.id, doc: doc.data()}
          });
          let joined = this.state.messages.concat(orderedMessages);
          this.setState({messages:joined});
        });
  };


  render() {
    return (
      <div className="App">
        <Messages
          messages={this.state.messages}
          currentMember={this.state.currentUser}
        />
        <Input
          onSendMessage={this.onSendMessage}
        />
      </div>
    );
  }

}

export default Chat;