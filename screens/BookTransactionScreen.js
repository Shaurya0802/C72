import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet, TextInput, Image, Alert, KeyboardAvoidingView, ToastAndroid} from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as firebase from 'firebase';
import db from '../config';

export default class TransactionScreen extends React.Component {
    constructor(){
      super();
      this.state = {
        hasCameraPermissions: null,
        scanned: false,
        scannedBookId: '',
        scannedStudentId: '',
        buttonState: 'normal',
        transactionMessage : '',
      }
    }

    getCameraPermissions = async (id) =>{
      const {status} = await Permissions.askAsync(Permissions.CAMERA);
      
      this.setState({
        /*status === "granted" is true when user has granted permission
          status === "granted" is false when user has not granted the permission
        */
        hasCameraPermissions: status === "granted",
        buttonState: id,
        scanned: false
      });
    }
    //where the type refers to the bar code type that was scanned and the data is the 
    //information encoded in the bar code (in this case of QR codes, this is often a URL).
    handleBarCodeScanned = async({type, data})=>{
      const {buttonState} = this.state;

      if(buttonState === "BookId"){
        this.setState({
          scanned: true,
          scannedBookId:data,
          buttonState:'normal'
        });
      } else if(buttonState === "StudentId"){
        this.setState({
          scanned: true,
          scannedStudentId: data,
          buttonState: 'normal'
        });
      }
    }

    initiateBookIssue = async () => {
      db.collection("transactions").add({
        'studentId': this.state.scannedStudentId,
        'bookId': this.state.scannedBookId,
        'date': firebase.firestore.Timestamp.now().toDate(),
        'transactionType': "Issue",
      });
      
      db.collection("books").doc(this.state.scannedBookId).update({
        'bookAvailability': false
      });

      db.collection("students").doc(this.state.scannedStudentId).update({
        'noOfBooksIssued': firebase.firestore.FieldValue.increment(1)
      });

      Alert.alert("Book Issued");

      this.setState({
        scannedBookId: "",
        scannedStudentId: ""
      });
    }

    initiateBookReturn = async () => {
      db.collection("transactions").add({
        'studentId': this.state.scannedStudentId,
        'bookId': this.state.scannedBookId,
        'date': firebase.firestore.Timestamp.now().toDate(),
        'transactionType': "Return",
      });

      db.collection("books").doc(this.state.scannedBookId).update({
        'bookAvailability': true
      });

      db.collection("students").doc(this.state.scannedStudentId).update({
        'noOfBooksIssued': firebase.firestore.FieldValue.increment(-1)
      });

      Alert.alert("Book returned");

      this.setState({
        scannedBookId: "",
        scannedStudentId: ""
      });
    }

    handleTransaction = async () => {
      /*var transactionMessage;
      db.collection("books").doc(this.state.scannedBookId).get()
      .then((doc) => {
        var book = doc.data();

        if (book.bookAvailability){
          this.initiateBookIssue();
          transactionMessage = "Book Issued";
          ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
        } else {
          this.initiateBookReturn();
          transactionMessage = "Book Returned";
          ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
        }
      });
      this.setState({
        transactionMessage: transactionMessage
      });*/

      var transactionType = await this.checkBookEligibility();

      console.log(transactionType);

      if (!transactionType) {
        Alert.alert("The book doesn't exist in the library database.");

        this.setState({
          scannedStudentId: "",
          scannedBookId: ""
        });
      } else if (transactionType === "Issue") {
          var isStudentEligible = await this.checkStudentEligibilityForBookIssue();

          if (isStudentEligible) {
            this.initiateBookIssue();

            Alert.alert("Book issued to the student");
          }

      } else {
        var isStudentEligible = await this.checkStudentEligibiltyForReturn();

        if( isStudentEligible ) {
          this.initiateBookReturn();

          Alert.alert("Book returned to the library");
        } 
      }
    }

    checkStudentEligibilityForBookIssue = async () => {
      const studentRef = await db.collection("students").
                              where("studentId", "==", this.state.scannedStudentId).get();

      var isStudentEligible = "";

      if (studentRef.docs.length == 0) {
        this.setState({
          scannedBookId: '',
          scannedStudentId: ''
        });

        isStudentEligible = false;

        Alert.alert("The student Id doesn't exist in the database");

      } else {
        studentRef.docs.map((doc) => {
          var student = doc.data();

          if (student.noOfBooksIssued < 2) {
            isStudentEligible = true;
          }  else {
            isStudentEligible = false;
            Alert.alert("The student has already issued 2 books");

            this.setState({
              scannedBookId: '',
              scannedStudentId: ''
            });
          }
        });
      }
      return isStudentEligible;
    }

    checkStudentEligibiltyForReturn = async () => {
      const transactionRef = await db.collection("transactions").where("bookId", "==", this.state.scannedBookId).
                            limit(1).get();

      var isStudentEligible = "";

      transactionRef.docs.map((doc) => {
        var lastBookTransaction = doc.data();

        if (lastBookTransaction.studentId == this.state.scannedStudentId) {
          isStudentEligible = true;
        } else {
          isStudentEligible = false;

          Alert.alert("The book wasn't issued by this student");

          this.setState({
            scannedBookId: '',
            scannedStudentId: ''
          });
        } 
      });
      return isStudentEligible;
    }

    checkBookEligibility = async () => {
      const bookRef = await db.collection("books").where("bookId", "==", this.state.scannedBookId).get();

      var transactionType = "";

      if (bookRef.docs.length == 0) {
        transactionType = false;
        
        console.log(bookRef.docs.length);
      } else {
        bookRef.docs.map((doc) => {
          var book = doc.data();

          if (book.bookAvailability) {
            transactionType = "Issue";
          } else {
            transactionType = "Return";
          }
        });
      }
      return transactionType;
    }

    render() {
      const hasCameraPermissions = this.state.hasCameraPermissions;
      const scanned = this.state.scanned;
      const buttonState = this.state.buttonState;

      if (buttonState !== "normal" && hasCameraPermissions){
        return(
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        );
      }

      else if (buttonState === "normal"){
        return(
          <KeyboardAvoidingView style={styles.container} behavior="padding" enabled >
            <View>
              <View>
                <Image style={{width:200, height:200}} source={require('../assets/booklogo.jpg')}/>

                <Text style={{textAlign:'center', fontSize:30}}>Wily</Text>
              </View>

              <View style={styles.inputView}>
                <TextInput 
                  style={styles.inputBox} 
                  placeholder="Book ID" 
                  onChangeText={text => this.setState({
                    scannedBookId: text
                  })}
                  value={this.state.scannedBookId}
                />
                  

                <TouchableOpacity 
                  style={styles.scanButton} 
                  onPress={()=>{
                    this.getCameraPermissions("BookId");
                  }}>
                  <Text style={styles.buttonText}>Scan</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.container}>
                <TextInput 
                  style={styles.inputBox} 
                  placeholder="Student ID" 
                  onChangeText={text => this.setState({
                    scannedStudentId: text
                  })}
                  value={this.state.scannedStudentId}/>

                <TouchableOpacity 
                  style={styles.scanButton}
                  onPress={()=>{
                    this.getCameraPermissions("StudentId");
                  }}>
                  <Text style={styles.buttonText}>Scan</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={async () => {this.handleTransaction();
                this.setState({
                  scannedBookId: "",
                  scannedStudentId: ""
                });
              }}>
                <Text style={styles.submitButtonText}>SUBMIT</Text>
    
              </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        );
      }
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    displayText:{
      fontSize: 15,
      textDecorationLine: 'underline'
    },
    scanButton:{
      backgroundColor: '#2196F3',
      padding: 10,
      margin: 10
    },
    buttonText:{
      fontSize: 20,
    },
    inputBox:{
      width:200,
      height:40,
      borderWidth:1.5,
      borderRightWidth:0,
      fontSize:20
    },
    inputView:{
      flexDirection:"row",
      margin:20
    },
    submitButton:{
      backgroundColor: '#FF0000',
      width: 100,
      height: 50
    },
    submitButtonText: {
      padding: 10,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFF'
    }

  });