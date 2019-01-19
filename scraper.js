//Creating a variable for the error log's name and file path.  Will be used in the fs.appendFileSync method later.
const errorFilePath = './scraper-error.log';

//Gets the current time and outputs a string containing the year/month/day, and hour/minute/seconds.
function getCurrentTime() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const formattedDate = `[${year}/${month}/${day}, ${hours}:${minutes}:${seconds}]`;
  return formattedDate;
}

//Gets the current time and outputs a string containing the year-month-day.
function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}

//Require the fs module
const fs = require('fs');

//Check for a directory called 'data' and save to variable
const dataDirectory = fs.existsSync('./data');

//If data exists, do nothing.  Else, create it.
if (dataDirectory) {
  console.log('"data" directory exists, Continuing...');
} else {
  //Make the directory
  fs.mkdirSync('./data');

  //Save the error to the log file.
  let dataDirectoryError = getCurrentTime() + ' - "data" directory did not exist.  Created directory.\n';
  fs.appendFileSync(errorFilePath, dataDirectoryError);
}

//Axios for getting the web data
const axios = require('axios');

//Cheerio for navigating and manipulating the data
const cheerio = require('cheerio');

//Jsonexport for exporting to CSV
const jsonexport = require('jsonexport');

//Make the initial request to the main URL
axios.get('http://shirts4mike.com/shirts.php')
  .then(function (response) {

    //Use cheerio to manipluate the data received
    const $ = cheerio.load(response.data);

    //Create an array for the individual shirt links
    const shirtLinks = [];

    //Add each shirt link to the array.
    $('ul[class=products] li a').each(function(i, elem) {
      shirtLinks[i] = 'http://shirts4mike.com/' + $(this).attr('href');
    });

    //Create a variable for the CSV file name and path.
    const filePathName = 'data/' + getCurrentDate() + '.csv';

    //If the file already exists, delete it.  If it can't be deleted, log the error.
    fs.unlink(filePathName, (err) => {
      if (err) {
        let oldFileDeletionError = getCurrentTime() + ' - Trouble deleting old file.  Received this message -> ' + err.message + '\n';
        fs.appendFileSync(errorFilePath, oldFileDeletionError);
      };
    });

    //Scrape 8 tee shirts without using a hard-coded url
    //Create an array to hold the shirt objects
    let shirtsArray = [];

    //For each shirt link, request the page and extract the needed information.
    for (let i = 0; i < shirtLinks.length; i +=1) {
      axios.get(shirtLinks[i])
        .then(function (response) {

          //Use cheerio to manipluate the data received.
          const $ = cheerio.load(response.data);

          const price = $('span[class=price]').text();
          const title = $('div[class=shirt-details] h1').text().slice(4);
          const url = shirtLinks[i];
          const imageURL = $('div[class=shirt-picture] span img').attr('src');
          const time = getCurrentTime();

          //Create a shirt object to add to the shirtsArray.
          const shirtObject = {
            'price': price,
            'title': title,
            'url': url,
            'image_url': imageURL,
            'time': time
          };

          shirtsArray[i] = shirtObject;

          //If we've reached the end of the array, write out a CSV file.
          if (i === shirtLinks.length - 1) {

            //Use jsonexport to turn the shirtsArray into a CSV file.
            jsonexport(shirtsArray, function(err, csv){
              if (err) {
                let jsonExportError = getCurrentTime() + ' - Trouble using jsonexport.  Received this message -> ' + err.message + '\n';
                fs.appendFileSync(errorFilePath, jsonExportError);
              };
              fs.writeFileSync(filePathName, csv, (err) => {
                if (err) {
                  let csvFileWriteError = getCurrentTime() + ' - Trouble writing CSV file.  Received this message -> ' + err.message + '\n';
                  fs.appendFileSync(errorFilePath, csvFileWriteError);
                };
              }); //end fs.writeFileSync
            }); //end jsonexport
          }; //end CSV write process
        }) //end then
        .catch(function (error) {
          console.log('Having trouble connecting to a specific shirt page.  Received this error -> ' + error.message);
          let shirtSiteConnError = getCurrentTime() + ' - Having trouble connecting to a specific shirt page.  Received this error -> ' + error.message + '\n';
          fs.appendFileSync(errorFilePath, shirtSiteConnError);
        }); //end catch and axiom sub-request
    };
  }) //end main axiom then
  .catch(function (error) {
    console.log('Having trouble connecting to the main site.  Received this error -> ' + error.message);
    let mainSiteConnError = getCurrentTime() + ' - Having trouble connecting to the main site.  Received this error -> ' + error.message + '\n';
    fs.appendFileSync(errorFilePath, mainSiteConnError);
}); //end main axiom catch and main axiom request
