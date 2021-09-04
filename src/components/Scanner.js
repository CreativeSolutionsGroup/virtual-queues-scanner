import React, { Component } from 'react'
import QrReader from 'react-qr-reader'
import { Modal, Icon, Button, Image, Grid, Accordion, AccordionContent, AccordionTitle, Divider, Transition, Loader, Dimmer} from 'semantic-ui-react'
import axios from "axios";
import smart_events_logo from "../images/smart-events-logo.png";
import VQ_QR_CODE from "../images/vq-cusmartevents-com.png"
import CHECK_IN_QR_CODE from "../images/SMS-StudentID-Checkin.png"

export default class Scanner extends Component {

    state = {
        scannerMode: 0,
        result: 'No result',
        isScanning: false,
        popupOpen: false,
        popupIcon: "",
        popupText: "",
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        showTapHint: true,
        linkModalVisible: false,
        tickInfoModalOpen: false,
        attractionNames: {},
        slotInfo: {},
        selectedTicketAttractions: [],
        selectedLink: -1
    }

    serverAddress = 'https://api.cusmartevents.com'
    smartEventsPhoneNumber = '(205) 883-0991'
    virtualQueuesLink = 'vq.cusmartevents.com'

    componentDidMount() {
        window.addEventListener("resize", this.handleResize);
        this.getSlotInfo();
    }

    handleResize = (e) => {
        this.setState({ windowWidth: window.innerWidth, windowHeight: window.innerHeight });
    };

    componentWillUnmount() {
        window.addEventListener("resize", this.handleResize);
    }

    handleScan = data => {
        if (data) {
            if (this.state.isScanning) {
                this.ticketPopup(data);
                this.setState({
                    result: data,
                    isScanning: false
                })
            }
        }
    }

    handleError = err => {
        console.error(err)
    }

    isScannerOn() {
        return this.state.scannerMode !== -1;
    }

    toggleCameraMod(){
        let currentMode = this.state.scannerMode;
        let newMode = -1;
        if(currentMode === 0){
            newMode = 1;
        }
        if(currentMode === 1){
            newMode = -1;
        }
        if(currentMode === -1){
            newMode = 0;
        }
        this.setState({scannerMode: newMode});
    }

    getCameraButtonColor(){
        let currentMode = this.state.scannerMode;
        if(currentMode === -1){
            return undefined
        }
        if(currentMode === 1){
            return 'blue'
        }
        return 'green';
    }

    getCameraButtonIcon(){
        let currentMode = this.state.scannerMode;
        if(currentMode === -1){
            return 'eye slash'
        }
        if(currentMode === 0){
            return 'camera'
        }
        return 'user';
    }

    ticketPopup(qrData) {
        if (this.state.showTapHint) {
            this.setState({ showTapHint: false })
        }
        //Make sure it is a valid ticket string
        if (/^[0-9a-fA-F]{24}$/.test("" + qrData)) {
            fetch(this.serverAddress + "/api/tickets/" + qrData)
                .then((res) => res.json())
                .then((res) => {
                    if (res.status === "success") {

                        if (res.data === null) {
                            this.startPopup("invalid");
                        }
                        else {
                            if (res.data.scanned) {
                                this.startPopup("rescan");
                            } else {
                                this.scanTicket(qrData);
                            }
                        }
                    }
                });
        } else {
            this.startPopup("invalid");
        }
    }

    scanTicket(ticketId) {
        let values = { scanned: true }
        axios.put(this.serverAddress + '/api/tickets/' + ticketId, values)
            .then(async response => {
                const data = await response.data;

                if (data.status !== "success") {
                    alert("Error: " + data.message);
                    console.log(data.message);
                } else {
                    this.startPopup("scanned");
                }
            })
            .catch(error => {
                alert("Error: " + error);
                console.log(error);
            });
    }

    startPopup(type) {
        let text = "";
        let icon = "";
        if (type === "invalid") {
            text = "Invalid Ticket";
            icon = "ban"
        }
        else if (type === "scanned") {
            text = "Scanned Ticket";
            icon = "check"
        }
        else if (type === "rescan") {
            text = "Already scanned";
            icon = "redo"
        }
        this.setState({ popupOpen: true, popupText: text, popupIcon: icon })
        setTimeout(() => this.setState({ popupOpen: false, popupText: "", popupIcon: "" }), 1500)
    }

    getTicketIconColor(icon){
        if(icon === 'check'){
            return 'green'
        }
        if(icon === 'ban'){
            return 'red'
        }
        return undefined;
    }


    showLinks() {
        this.setState({ linkModalVisible: true })
    }

    showTicketInfo() {
        this.setState({ tickInfoModalOpen: true })
    }

    getSlotInfo() {

        //Get Attraction Names
        fetch(this.serverAddress + '/api/attractions/')
            .then((res) => res.json())
            .then(
                (res) => {
                    if (res.status !== "success") {
                        console.log("Failed to retrieve Attractions");
                        console.log(res.message);
                        alert("Error (Attractions): " + res.message);
                        this.setState({ attractionNames: {} });
                    }
                    else {
                        let attractions = {}
                        res.data.forEach((attraction) => {
                            attractions[attraction._id] = attraction.name;
                        })
                        this.setState({ attractionNames: attractions })
                    }
                },
                (err) => {
                    console.error("Failed to retrieve Attractions");
                    console.error(err);
                    this.setState({ attractionNames: {} });
                }
            );

        //Get Slot Info
        fetch(this.serverAddress + '/api/slots/')
            .then((res) => res.json())
            .then(
                (res) => {
                    if (res.status !== "success") {
                        console.log("Failed to retrieve Slots");
                        console.log(res.message);
                        alert("Error (Slots): " + res.message);
                        this.setState({ slotInfo: {} });
                    }
                    else {
                        let slots = {}
                        //Sort by time 
                        let sortedSlots = res.data.sort((a, b) => {
                            return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
                        });
                        sortedSlots.forEach(async (slot) => {
                            //Get tickets for slot
                            let tickets = await fetch(this.serverAddress + '/api/slots/' + slot._id + "/tickets").then(res => res.json()).then(res => res.data);
                            let ticketCount = tickets.length;
                            //Get scanned ticket amount
                            let scannedTickets = tickets.filter((ticket) => ticket.scanned === true).length;
                            let slotList = slots[slot.attraction_id] === undefined ? [] : slots[slot.attraction_id];
                            slotList.push({ name: slot.label, time: slot.hide_time, ticketCount: ticketCount, scannedTickets: scannedTickets, capacity: slot.ticket_capacity });
                            slots[slot.attraction_id] = slotList;
                            this.setState({ slotInfo: slots });
                        })
                    }
                },
                (err) => {
                    console.error("Failed to retrieve Slots");
                    console.error(err);
                    this.setState({ slotInfo: {} });
                }
            );
    }

    displayTime(time) {
        let date = new Date(Date.parse(time));
        let hour = date.getHours();
        let min = date.getMinutes();
        return (hour % 12) + ":" + (min < 10 ? "0" + min : min) + " " + (hour > 11 ? "PM" : "AM");
    }

    buildTicketAccordionPanels() {
        let sortedKeys = Object.keys(this.state.slotInfo).sort();

        if(sortedKeys.length === 0){
            return (
                <div style={{display: 'flex'}}>
                    <div style={{marginLeft: 'auto', marginRight: 'auto'}}>
                        No Active Attractions are available currently
                    </div>
                </div>
            );
        }

        return sortedKeys.map((key) => {
            let slot = this.state.slotInfo[key];
            return (
                <div>
                    <AccordionTitle
                        active={this.state.selectedTicketAttractions.includes(key)}
                        onClick={() => {
                            let newSelectionList = this.state.selectedTicketAttractions;
                            let index = this.state.selectedTicketAttractions.indexOf(key);
                            if (index !== -1) {
                                newSelectionList.splice(index, 1);
                            } else {
                                newSelectionList.push(key);
                            }
                            this.setState({ selectedTicketAttractions: newSelectionList });
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            <Icon name='dropdown' style={{ marginTop: 'auto', marginBottom: 'auto' }} />
                            <h2 style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                                {this.state.attractionNames[key] == undefined ? "UNKNOWN ATTRACTION" : this.state.attractionNames[key]}
                            </h2>
                        </div>
                    </AccordionTitle>
                    <AccordionContent
                        active={this.state.selectedTicketAttractions.includes(key)}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Divider />
                            {
                                slot.map(element => {
                                    return (
                                        <div>
                                            <div style={{ display: 'flex', flexDirection: 'row', marginTop: 5, marginBottom: 5 }}>

                                                <div style={{ marginLeft: 10, marginTop: 'auto', marginBottom: 'auto', marginRight: 'auto' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <h3 style={{ marginLeft: 'auto', marginRight: 'auto', marginBottom: 0 }}>{element.name}</h3>
                                                        <h3 style={{ marginLeft: 'auto', marginRight: 'auto', marginTop: 0 }}>{
                                                            this.displayTime(element.time)
                                                        }</h3>
                                                    </div>
                                                </div>
                                                <div style={{ marginLeft: 'auto', marginTop: 'auto', marginBottom: 'auto', marginRight: 'auto' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <Icon name='ticket' size='large' style={{ marginLeft: 'auto', marginRight: 'auto' }} />
                                                        <h3 style={{ marginTop: 5 }}>{element.ticketCount}/{element.capacity}</h3>
                                                    </div>
                                                </div>
                                                <div style={{ marginLeft: 'auto', marginTop: 'auto', marginBottom: 'auto', marginRight: 20 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <Icon name='qrcode' size='large' style={{ marginLeft: 'auto', marginRight: 'auto' }} />
                                                        <h3 style={{ marginTop: 5, marginBottom: 0 }}>{(element.scannedTickets) + "/" + element.ticketCount}</h3>
                                                        <h3 style={{ marginTop: 0, marginLeft: 'auto', marginRight: 'auto' }}>{"(" + (element.ticketCount - element.scannedTickets) + ")"}</h3>
                                                    </div>
                                                </div>
                                            </div>
                                            <Divider />
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </AccordionContent>
                </div>
            )
        })
    }

    buildTicketAccordion() {
        return (
            <Accordion styled fluid>
            {
                this.buildTicketAccordionPanels()
            }
            </Accordion>
        );
    }

    render() {

        const { windowWidth, windowHeight } = this.state;

        //Resize to fit square in middle of screen
        let scannerSize = windowWidth;

        if(windowHeight < windowWidth){
            scannerSize = windowHeight * 0.75;
        }

        return (
            <div>
                {/*Top Header*/}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                        <div style={{ width: "90%" }}>
                            <Image src={smart_events_logo} size='medium' centered />
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <Icon name='ticket' size='big' style={{ marginLeft: 'auto' }}></Icon>
                                <h3 style={{ marginTop: 'auto', marginBottom: 'auto', marginLeft: 5, marginRight: 'auto' }}>Ticket Scanner</h3>
                            </div>
                        </div>
                    </div>
                </div>
               
                {/*QR Scanner*/}
                <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: (scannerSize), height: (scannerSize),
                    display: 'flex', flexDirection: 'column'
                }}>
                    {this.isScannerOn() ? <div style={{ margin: 20, marginBottom: 10 }}>
                        <div
                            onClick={() => {
                                this.setState({ isScanning: true })
                                setTimeout(()=> {
                                    this.setState({ isScanning: false }) //Timeout scanning
                                }, 3000);
                            }}
                        >
                            <QrReader
                                delay={300}
                                onError={this.handleError}
                                onScan={this.handleScan}
                                facingMode={this.state.scannerMode === 1 ? 'user' : 'environment'}
                            />
                        </div>
                        {this.state.isScanning ? 
                            <div style={{zIndex: 10, position: 'relative', top: '-100%', width: '100%', height: '100%'}}>
                                <Dimmer active>
                                    <Loader active inline='centered' size='huge'>Scanning...</Loader>
                                </Dimmer>
                            </div> 
                        : ""}
                    </div> : ""}
                    {this.isScannerOn() && this.state.showTapHint ? <div style={{ marginLeft: 'auto', marginRight: 'auto' }}><h2>Tap to Scan Ticket</h2></div> : ""}
                    
                    {!this.isScannerOn() ?
                        <div style={{ margin: 'auto' }}>
                            <Icon name='qrcode' size='massive'></Icon>
                            <h2>Scanner is off</h2>
                        </div> :
                        ""}
                </div>

                {/*Bottom button array*/}
                <div style={{ display: 'flex', width: '100%', position: 'absolute', bottom: "3%" }}>
                    <Grid style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        <Grid.Row columns={3}>
                            <Grid.Column style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                <Button
                                    circular
                                    onClick={() => {
                                        this.showTicketInfo();
                                    }}
                                    size="massive"
                                    icon
                                    color='orange'
                                >
                                    <Icon name="ticket" />
                                </Button>
                            </Grid.Column>
                            <Grid.Column style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                <Button
                                    circular
                                    onClick={() => {
                                        this.toggleCameraMod();
                                    }}
                                    size="massive"
                                    icon
                                    color={this.getCameraButtonColor()}
                                >
                                    <Icon name={this.getCameraButtonIcon()} />
                                </Button>
                            </Grid.Column>
                            <Grid.Column style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                <Button
                                    circular
                                    onClick={() => {
                                        this.showLinks();
                                    }}
                                    size="massive"
                                    color='pink'
                                    icon
                                >
                                    <Icon name="linkify" />
                                </Button>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </div>

                {/*Scan event popup for info on QR Code*/}
                <Transition visible={this.state.popupOpen} animation='scale' duration={200}>
                    <Modal
                        open={this.state.popupOpen}
                    >
                        <Modal.Content>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Icon
                                    name={this.state.popupIcon}
                                    size='massive'
                                    style={{ marginLeft: 'auto', marginRight: 'auto', width: '100%' }}
                                    color={this.getTicketIconColor(this.state.popupIcon)}
                                />
                                <h1 style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                    {this.state.popupText}
                                </h1>
                            </div>
                        </Modal.Content>
                    </Modal>
                </Transition>
                {/*Popup for sharing Links*/}
                <Transition visible={this.state.linkModalVisible} animation='scale' duration={200}>
                    <Modal
                        open={this.state.linkModalVisible}
                        onClose={() => this.setState({ linkModalVisible: false })}
                        closeIcon
                    >
                        <Modal.Header>
                            Smart Events QR Codes
                        </Modal.Header>
                        <Modal.Content>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Accordion styled>
                                    <AccordionTitle
                                        active={this.state.selectedLink === 0}
                                        onClick={() => {
                                            let newIndex = 0;
                                            if(this.state.selectedLink === 0){
                                                newIndex = -1;
                                            }
                                            this.setState({selectedLink: newIndex});
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Icon name='dropdown' style={{ marginTop: 'auto', marginBottom: 'auto' }} />
                                            <h2 style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                                                Virtual Queues Link
                                            </h2>
                                        </div>
                                    </AccordionTitle>
                                    <AccordionContent
                                        active={this.state.selectedLink === 0}
                                    >
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <div style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                <Image src={VQ_QR_CODE} />
                                            </div>
                                            <div style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                <h2>{this.virtualQueuesLink}</h2>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                    <AccordionTitle
                                        active={this.state.selectedLink === 1}
                                        onClick={() => {
                                            let newIndex = 1;
                                            if(this.state.selectedLink === 1){
                                                newIndex = -1;
                                            }
                                            this.setState({selectedLink: newIndex});
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Icon name='dropdown' style={{ marginTop: 'auto', marginBottom: 'auto' }} />
                                            <h2 style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                                                Event Check-in Phone#
                                            </h2>
                                        </div>
                                    </AccordionTitle>
                                    <AccordionContent
                                        active={this.state.selectedLink === 1}
                                    >
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <div style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                <Image src={CHECK_IN_QR_CODE} />
                                            </div>
                                            <div style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                <h2>{this.smartEventsPhoneNumber}</h2>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </Accordion>
                            </div>
                        </Modal.Content>
                    </Modal>
                </Transition>
                {/*Popup for slot ticket info*/}
                <Transition visible={this.state.tickInfoModalOpen} animation='scale' duration={200}>
                    <Modal
                        open={this.state.tickInfoModalOpen}
                        onClose={() => this.setState({ tickInfoModalOpen: false })}
                        closeIcon
                    >
                        <Modal.Header>
                            Attraction Information
                        </Modal.Header>
                        <Modal.Content>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {this.buildTicketAccordion()}
                                <Button
                                    icon labelPosition='right'
                                    onClick={() => {
                                        this.getSlotInfo();
                                    }}
                                    style={{ marginTop: 10, marginLeft: 'auto', marginRight: 'auto' }}
                                >
                                    <Icon name='refresh' />
                                    Refresh
                                </Button>
                            </div>
                        </Modal.Content>
                    </Modal>
                </Transition>
            </div>
        )
    }
}