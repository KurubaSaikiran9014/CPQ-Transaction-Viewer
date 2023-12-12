var tabUrl;
var openTransactionUrl;
let processId;
let transactionId = document.getElementById("input-text");
let viewXMLelement = document.getElementById("view-xml");
let openTransactionElement = document.getElementById("open-transaction");
let divloaderElement = document.getElementById("loader");
let loaderElement = divloaderElement.getElementsByTagName("span");
let getQuoteDataButton = document.getElementById("get-quote-data");

function getData(){
      browser.tabs.query({active: true, currentWindow:true},(tabs)=>{
        
        let currentTabUrl=tabs[0].url;
        if (currentTabUrl.includes("bigmachines.com")){
          let urlArray =currentTabUrl.split("/");
          tabUrl = urlArray[2]; //stores Host Name(domain Name)
          let metaDataUrl = "https://" + tabUrl + "/rest/v14/metadata-catalog"; // Meta Data URL to get Metadat
        //console.log(metaDataUrl);
    
          async function openXml(xslUrl, subdomain) {
          await fetch(xslUrl)
            .then(response => {
              if (!response.ok) {
                throw new Error("Fetching XSL Id failed.");
              }
              response.text().then(data => {
                console.log(data);
                var toSearch = "edit_xslt.jsp?id=";
                var pos = data.indexOf(toSearch);
                var xslIdStr = data.substr(pos + toSearch.length, 50);
                var newpos = xslIdStr.indexOf('"');
                var xslId = xslIdStr.substr(0, newpos); //retrieving xslt_id using string operations from the response
                var xmlUrl =
                  "https://" +
                      subdomain +
                  "/admin/commerce/views/preview_xml.jsp?bs_id=" +
                  transactionId.value +
                  "&xslt_id=" +
                  xslId +
                  "&view_type=document";
                viewXMLelement.href = xmlUrl; 
                divloaderElement.style.height="0px";
                for (let i = 0; i<loaderElement.length; i++){
                  loaderElement[i].style.display = "none";
                }
                // loaderElement.style.display="none"; //hiding the spinner
                viewXMLelement.target = "_blank";
                viewXMLelement.style.backgroundColor = "#4fafc4";
              });
            })
            .catch(error => {
              console.error("Problem fetching XSL ID: ", error);
            });
          }
        
          const doNetworkCall = async (tabUrl,offsetVal) => { //fetch Rest api Call
          let options={
            "method":"GET",
            "headers": {
              "Access-Control-Allow-Origin": "*"

            }
          }
          const response = await fetch(metaDataUrl,options);
          if (response.ok === false){ //checking if user login or not
            divloaderElement.style.height="0px";
            for (let i = 0; i<loaderElement.length; i++){ //hiding loader element
              loaderElement[i].style.display = "none";
            }
            
            alert("Please Login With Your Credentials");

          }
          else{
            const jsonData = await response.json(); //store Metadata as json 
            let allCommerceProcces = []; // Stores All commerce Proccesses Names
            for (let eachProcessData of jsonData.items){
              if (eachProcessData.name.includes("commerceDocuments")){ //filtering Only Commerce Processes
                allCommerceProcces.push(eachProcessData.name);
              }
            }
            console.log(allCommerceProcces);
            let destinationCommerceProcess = ""; // Destinated commerce process that user Entered Transaction Id Presents
            for (let eachProcessName of allCommerceProcces){  //cheking The TransactionId in each Commerce Process
                        
            let allTransactionIDs = [];// stores All Transaction Ids in current Proccess

            let processVarName; //stores each process Var name Uses for Open TransactionQuote
            let page=0; //store current page (each page have 1000 transaction objects)
            let offsetVal = page *1000;
            console.log(eachProcessName);

            async function doRestCall(){
                let processTransactionDataUrl = 
                "https://" +
                  tabUrl + 
                  "/rest/v14/" +
                    eachProcessName+"?offset="+String(offsetVal);   // url for getting each transaction Data
              //console.log(processTransactionDataUrl);
              const transactionResponse = await fetch(processTransactionDataUrl, options);
              if (transactionResponse.ok ===false){
                alert("Failed to fetch Transaction Data");
                divloaderElement.style.height="0px";//hiding loader
                for (let i = 0; i<loaderElement.length; i++){
                  loaderElement[i].style.display = "none";
                }
              }else{
              const transactionData = await transactionResponse.json()
              //console.log(eachProcessName);
              //console.log(transactionData.items);
              
              
              //checking transaction Id In each Commerce Proccess Transaction Data
              for (let eachTransaction of transactionData.items){
                  allTransactionIDs.push(eachTransaction._id); //pushing all tranactin ID in to an Array
                  processVarName = eachTransaction._process_var_name;
              }
              if ((transactionData.hasMore === true) && (allTransactionIDs.includes(parseInt(transactionId.value)) === false)){ //checking if tranasctions are more than 1000 in current process if yes doing api call again
                page = page+1;
                offsetVal=(page*1000)+1;
                await doRestCall();
              }
            }
            }
              await doRestCall();
              console.log(allTransactionIDs);
              if (allTransactionIDs.includes(parseInt(transactionId.value))){ //checking if transaction id in the TransactionID Array
                    destinationCommerceProcess = processVarName;  //storing processname for entered TranasctionId
                    break;
              }
              
            }
            console.log(destinationCommerceProcess);
            
            if (destinationCommerceProcess === ""){ //if the quote Id is Incorrect(it didn't present in any commerce transaction)
              divloaderElement.style.height="0px";
            for (let i = 0; i<loaderElement.length; i++){ //hiding loader element
              loaderElement[i].style.display = "none";
            }
              alert("Incorrect TransactionId"); //alerting the user as Entered incorrect TraansactionId
              transactionId.value = ""; //Clearing The input element 
            }else{
              openTransactionUrl = 
                "https://" + 
                tabUrl +
                "/commerce/transaction/" + 
                destinationCommerceProcess +
                "/" + transactionId.value; //quote URL

              openTransactionElement.href  = openTransactionUrl;//quote Url
              openTransactionElement.target ="_blank"; // opening the quote in New tab 
              openTransactionElement.style.backgroundColor = "#4fafc4"; // changing the background color after getting the url
              }

              // searching for XML  

              let commerceDocumentDataForProcessIdUrl = 
                  "https://" +
                  tabUrl +
                  "/rest/v14/commerceProcesses/"+ 
                  destinationCommerceProcess +
                    "/documents" ; // commerce document metadata url

              let commerceDocumentMetaData = await fetch(commerceDocumentDataForProcessIdUrl , options);  //api call to get commerce document metadata
              let documentMetadataResponse = await commerceDocumentMetaData.json();
              processId = documentMetadataResponse.items[0].process.id; // getting process ID from the CommerceDocument Metadata
              let xslurl = 
                  "https://" +
                  tabUrl +
                  "/admin/commerce/views/list_xslt.jsp?process_id=" +
                  processId ;  // xml document URL

              openXml(xslurl,tabUrl); 
          }
          };
          doNetworkCall(tabUrl);
        }
        else{
          divloaderElement.style.height="0px";
          for (let i = 0; i<loaderElement.length; i++){
            loaderElement[i].style.display = "none";
          }
          alert("This Extension Doesn't Run In this Tab");
        }
        })  
}

getQuoteDataButton.addEventListener("click",function(){
  if (transactionId.value !== ""){
    divloaderElement.style.height="40px";
    for (let i = 0; i<loaderElement.length; i++){ //hiding loader element
      loaderElement[i].style.display = "block";
    }
    getData();
    }else{
      alert("Enter Quote Number");
    }
})


/*
transactionId.addEventListener("keydown",function(event){
  if (event.key === "Enter"){
    loadingElement.innerText = "Loading....Please Wait";
    getData();
  }
})

openTransactionElement.addEventListener("click",function(){
  if (transactionId.value !== ""){
    loadingElement.innerText = "Loading....Please Wait";
    getData();
    }
})

viewXMLelement.addEventListener("click",function(){
  if (transactionId !== ""){
    loadingElement.innerText = "Loading....Please Wait";
    getData();
  }
})*/


