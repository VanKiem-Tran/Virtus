import React, {Component} from 'react';
import './CourseDetail.css';
import {db, fdb} from "./db";
import {Col, Container, Row} from "react-bootstrap";
import Button from "react-bootstrap/Button";
import {createLiveStream} from "./streaming";
import {Redirect} from "react-router-dom";

class CourseDetail extends Component {

    CURRENT_USER_ID = "X6zZQfcy7ybnb6pc9vmT1RGopix1";

    constructor() {
        super();
        this.state = {
            courseId: null,
            course: null,
            liveOfficeHours: [],
            recordedOfficeHours: [],
            redirectURL: null,
            currentUser: null
        };
    }

    componentDidMount() {
        const {courseId} = this.props.match.params;

        db.auth().onAuthStateChanged((user) => {
            this.setState({currentUser: user});
        });

        fdb.collection("courses")
            .doc(courseId)
            .onSnapshot(course => {

                if (!course.exists) {
                    return;
                }

                course = course.data();

                this.setState({courseId, course})
            });

        fdb.collection("office_hour")
            .where("course", "==", fdb.collection("courses").doc(courseId))
            .where("mux_data.status", "==", "active")
            .onSnapshot(querySnapshot => {
                const liveOfficeHours = querySnapshot.docs.map(doc => {
                    return {id: doc.id, doc: doc.data()}
                });
                this.setState({liveOfficeHours});
            });

        fdb.collection("office_hour")
            .where("course", "==", fdb.collection("courses").doc(courseId))
            .where("mux_data.status", "==", "idle")
            .where("pre_stream", "==", "false")
            .orderBy("time_created")
            .onSnapshot(querySnapshot => {
                const recordedOfficeHours = querySnapshot.docs.map(doc => {
                    return {id: doc.id, doc: doc.data()}
                });
                this.setState({recordedOfficeHours});
            });

    }

    startLiveSession = () => {
        createLiveStream()
            .then(({muxData}) => {

                // Create a new office hour
                fdb.collection("office_hour")
                    .add({
                        course: fdb.collection("courses").doc(this.state.courseId),
                        description: "",
                        messages: [],
                        pre_stream: true,
                        ta: fdb.collection("user_accounts").doc(this.CURRENT_USER_ID),
                        tickets: [],
                        mux_data: muxData,
                        time_created: new Date()
                    })
                    .then((docRef) => {
                        let officeHoursID = docRef.id;
                        this.setState({redirectURL: "/courses/" + this.state.courseId + "/oh/" + officeHoursID});
                    })

            });
    };

    isStudent() {
        if (!this.state.currentUser)
            return true;
        fdb.collection("user_accounts").doc(this.state.currentUser.uid).get().then(user_account => {
            if (!user_account.exists)
                return true;
            return user_account.data().is_ta || true;
        });
    }

    renderLiveSessions() {
        if (this.state.liveOfficeHours.length === 0) {

            if (this.isStudent()) {
                return (<Row>
                    <Col>
                        <p>There are currently no live sessions.</p>
                    </Col>
                </Row>);
            }

            return (
                <Row>
                    <Col xs={12}>
                        <p>There are currently no live sessions.</p>
                    </Col>
                    <Col xs={12}>
                        <Button variant="primary" onClick={this.startLiveSession}>Start a live session</Button>
                    </Col>
                </Row>
            );

        }
    }

    renderRecordings() {
        if (this.state.recordedOfficeHours.length === 0) {
            return (<Row>
                <Col><p>There are no recordings for this course.</p></Col></Row>);
        }
    }

    render() {
        if (this.state.redirectURL) {
            return <Redirect to={this.state.redirectURL}/>
        }

        if (!this.state.course)
            return <div/>;

        return (
            <Container className={"pt-5"}>
                <Row>
                    <Col>
                        <h1>{this.state.course.code} - {this.state.course.name}</h1>
                    </Col>
                </Row>

                <Row className={"mt-5"}>
                    <Col>
                        <h3>Live sessions</h3>
                    </Col>
                </Row>

                {this.renderLiveSessions()}

                <Row className={"mt-5"}>
                    <Col>
                        <h3>Recordings</h3>
                    </Col>
                </Row>
                {this.renderRecordings()}
            </Container>
        );
    }
}

export default CourseDetail;