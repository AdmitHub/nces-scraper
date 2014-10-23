var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');

var stateList = new Array("AK","AL","AR","AZ","CA","CO","CT","DC","DE","FL","GA","GU","HI","IA","ID", "IL","IN","KS","KY","LA","MA","MD","ME","MH","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY", "OH","OK","OR","PA","PR","PW","RI","SC","SD","TN","TX","UT","VA","VI","VT","WA","WI","WV","WY");
var urls = [];

(function scrape(stateIndex, page) {
  if (page === undefined) {
    page = 1;
  }

  var url = 'http://nces.ed.gov/collegenavigator/?s=' + stateList[stateIndex] + '&l=93&ct=1+2&ic=1&pg=' + page;
  request({
    uri: url
  }, function(err, res, body) {
    var $ = cheerio.load(body);
    var table = $('#ctl00_cphCollegeNavBody_ucResultsMain_tblResults');
    table.find('> tr > td:nth-child(2) > a').each(function() {
      var href = $(this).attr('href');
      console.log(href);
      urls.push(href);
    })

    if ($('.noresults').length === 0) {
      scrape(stateIndex, page+1);
    } else if (stateIndex !== stateList.length - 1) {
      scrape(stateIndex+1);
    } else {
      getSchoolData(urls);
    }
  })
})(0);

var getSchoolData = function(array){
  _.each(array, function(suffix) {
    var url = 'http://nces.ed.gov/collegenavigator/' + suffix;
    request({
      uri: url
    }, function(err, res, body){
      var $ = cheerio.load(body);
      var info = {};

      var header = $('.headerlg');

      info.collegeName = header.text();
      info.address = header.get(0) ? header.get(0).next.next.data : undefined;
      info.website = $('.layouttab').find('a').get(0) ? $('.layouttab').find('a').get(0).attribs.href.split('=').pop() : undefined;
      info.collegeType = $('.layouttab').find('> tr:nth-child(3) > td:nth-child(2)').text();
      info.setting = $('.layouttab').find('> tr:nth-child(5) > td:nth-child(2)').text();
      info.housing = $('.layouttab').find('> tr:nth-child(6) > td:nth-child(2)').text();
      info.population = $('.layouttab').find('> tr:nth-child(7) > td:nth-child(2)').text();
      info.studentToFacultyRatio = $('.layouttab').find('> tr:nth-child(8) > td:nth-child(2) > :nth-child(1)').text().indexOf('View note') > -1 ? $('.layouttab').find('> tr:nth-child(8) > td:nth-child(2) > :nth-child(1)').text().replace('View note', '') : $('.layouttab').find('> tr:nth-child(8) > td:nth-child(2)').text();
      info.IPEDS = suffix.split('=').pop();

      var religious = $('#ctl00_cphCollegeNavBody_ucInstitutionMain_divINFORight').find('div:contains("Religious Affiliation")');
      if (religious) {
        info.religiousAffiliation = religious.get(0) ? religious.get(0).next.data : undefined;
      };

      var expenses = $('#expenses').find('tr:contains("Total Expenses")');
      if (expenses) {
        var tuitionColumn = expenses.children().length - 2;
        info.averageExpenses = expenses.next().find('> td:nth-child(' + tuitionColumn + ')').next().get(0) ? expenses.next().find('> td:nth-child(' + tuitionColumn + ')').next().get(0).children[0].data : undefined;

        info.UndergradEnrollment = $('#enrolmt').find('td:contains("Undergraduate enrollment")').next().get(0) ? parseInt($('#enrolmt').find('td:contains("Undergraduate enrollment")').next().get(0).children[0].data.split(',').join('')) : undefined;

        var undergradAid = $('#finaid').find('div:contains("All Undergraduate Students")')
        info.percentReceivingAid = undergradAid.next().find('> tbody > tr:nth-child(1) > td:nth-last-child(3)').get(0) ? undergradAid.next().find('> tbody > tr:nth-child(1) > td:nth-last-child(3)').get(0).children[0].data : undefined;
        info.averageAid = undergradAid.next().find('> tbody > tr:nth-child(1) > td:nth-last-child(1)').get(0) ? undergradAid.next().find('> tbody > tr:nth-child(1) > td:nth-last-child(1)').get(0).children[0].data : undefined;
      }

      var admissions = $('#admsns');
      if (admissions) {
        info.totalNumberOfApplicants = admissions.find('td:contains("Number of applicants")').next().get(0) ? admissions.find('td:contains("Number of applicants")').next().get(0).children[0].data : undefined;
        info.numberOfMaleApplicants = admissions.find('td:contains("Number of applicants")').next().next().get(0) ? admissions.find('td:contains("Number of applicants")').next().next().get(0).children[0].data : undefined;
        info.numberOfFemaleApplicants = admissions.find('td:contains("Number of applicants")').next().next().next().get(0) ? admissions.find('td:contains("Number of applicants")').next().next().next().get(0).children[0].data : undefined;
        info.totalPercentAdmited = admissions.find('td:contains("Percent admitted")').next().get(0) ? admissions.find('td:contains("Percent admitted")').next().get(0).children[0].data : undefined;
        info.percentMaleAdmitted = admissions.find('td:contains("Percent admitted")').next().next().get(0) ? admissions.find('td:contains("Percent admitted")').next().next().get(0).children[0].data : undefined;
        info.percentFemaleAdmitted = admissions.find('td:contains("Percent admitted")').next().next().next().get(0) ? admissions.find('td:contains("Percent admitted")').next().next().next().get(0).children[0].data : undefined;

        var studentScoresSubmission = admissions.find('th:contains("Students submitting scores")');
        var studentScores = admissions.find('th:contains("Test Scores")');

        if (studentScoresSubmission) {
          info.percentSAT = studentScoresSubmission.parent().parent().parent().find('td:contains("SAT")').next().next().get(0) ? studentScoresSubmission.parent().parent().parent().find('td:contains("SAT")').next().next().get(0).children[0].data : undefined;
          info.percentACT = studentScoresSubmission.parent().parent().parent().find('td:contains("ACT")').next().next().get(0) ? studentScoresSubmission.parent().parent().parent().find('td:contains("ACT")').next().next().get(0).children[0].data : undefined;
        }

        if (studentScores) {
          console.log(suffix);
          info.SATReading25thPercentile = studentScores.parent().parent().parent().find('td:contains("SAT Critical Reading")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("SAT Critical Reading")').next().get(0).children[0].data : null;
          info.SATReading75thPercentile = studentScores.parent().parent().parent().find('td:contains("SAT Critical Reading")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("SAT Critical Reading")').next().next().get(0).children[0].data : null;
          info.SATMath25thPercentile = studentScores.parent().parent().parent().find('td:contains("SAT Math")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("SAT Math")').next().get(0).children[0].data : null;
          info.SATMath75thPercentile = studentScores.parent().parent().parent().find('td:contains("SAT Math")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("SAT Math")').next().next().get(0).children[0].data : null;
          info.SATWriting25thPercentile = studentScores.parent().parent().parent().find('td:contains("SAT Writing")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("SAT Writing")').next().get(0).children[0].data : null;
          info.SATWriting75thPercentile = studentScores.parent().parent().parent().find('td:contains("SAT Writing")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("SAT Writing")').next().next().get(0).children[0].data : null;
          info.ACTEnglish25thPercentile = studentScores.parent().parent().parent().find('td:contains("ACT English")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("ACT English")').next().get(0).children[0].data : null;
          info.ACTEnglish75thPercentile = studentScores.parent().parent().parent().find('td:contains("ACT English")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("ACT English")').next().next().get(0).children[0].data : null;
          info.ACTMath25thPercentile = studentScores.parent().parent().parent().find('td:contains("ACT Math")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("ACT Math")').next().get(0).children[0].data : null;
          info.ACTMath75thPercentile = studentScores.parent().parent().parent().find('td:contains("ACT Math")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("ACT Math")').next().next().get(0).children[0].data : null;
          info.ACTComposite25thPercentile = studentScores.parent().parent().parent().find('td:contains("ACT Composite")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("ACT Composite")').next().get(0).children[0].data : null;
          info.ACTComposite75thPercentile = studentScores.parent().parent().parent().find('td:contains("ACT Composite")').next().get(0) ? studentScores.parent().parent().parent().find('td:contains("ACT Composite")').next().next().get(0).children[0].data : null;
        }

      }

      console.log(info);
    })
  })
}

// getSchoolData(['?s=AL&l=93&ct=1+2&ic=1&pg=2&id=102368']);

