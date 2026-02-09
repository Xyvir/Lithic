/*\
title: $:/macros/buggyj/Calendar/base.js
type: application/javascript
module-type: macro

<<diary year month>>
<<diary year>> - year calendar
<<diary>> - this month

Options:$:/macros/diary/options.json
\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    exports.name = "calendarbase";

    exports.params = [
        { name: "year" }, { name: "month" }, { name: "opts" }
    ];

    exports.run = function (year, month, opts) {
        if (!opts) opts = "default";
        var options = $tw.wiki.getTiddlerData("$:/config/bj/Calendar.json")[opts] ||
            { lastDayOfWeek: "6", formatter: "", titlebold: "", highlightThisDay: "", highlightThisDate: "" };
        var createMonth;
        try {
            createMonth = require(options.formatter).createMonth;
        } catch (e) {
            createMonth = function (mnth, year) {
                var month = [];
                for (var i = 1; i < 1 + daysInMonth(mnth, year); i++) month[i] = i;
                return month;
            }
        }
        var boldtitle = (options.titlebold == 'yes') ? '!' : '';
        var day_of_week = (function () {
            var days = [];
            for (var i = 0; i < 7; i++) { days[i] = $tw.language.getString("Date/Short/Day/" + i); }
            return days;
        })();
        var month_of_year = (function () {
            var months = [];
            for (var i = 1; i < 13; i++) { months[i] = $tw.language.getString("Date/Long/Month/" + i); }
            return months;
        })();
        var Calendar = new Date();
        var thisyear = Calendar.getFullYear();  //  year (xxxx)
        var thismonth = Calendar.getMonth() + 1;	//  month (0-11)
        var thisday = Calendar.getDay();        //  day (0-6)
        var WEEKFIN = parseInt(options.lastDayOfWeek);
        var MONTHS_IN_YEAR = 12;

        var lf = '\n';
        var cal = '<div>' + lf + lf;
        var ayear = thisyear;

        // Helper to calculate next month for the preview
        function getNext(m, y) {
            var nm = parseInt(m) + 1;
            var ny = parseInt(y);
            if (nm > 12) { nm = 1; ny++; }
            return { m: nm, y: ny };
        }

        if (!!month) {
            // CASE 1: Specific Month Requested
            if (!!year) {
                cal += calendar(month, year, options);
                var next = getNext(month, year);
                cal += calendar(next.m, next.y, options, true); // Append next 2 weeks
            } else {
                cal += calendar(month, thisyear, options);
                var next = getNext(month, thisyear);
                cal += calendar(next.m, next.y, options, true); // Append next 2 weeks
            }
        } else {
            if (!!year) {
                // CASE 2: Year View (Single Column Stack)
                cal += titleOfYear(year);
                options.seperateYearHeading = 'yes';
                ayear = year;
                // MODIFIED: Show 15 months (spill over into next year's Jan/Feb/Mar)
                for (var i = 0; i < 15; i++) {
                    var currentMonth = (i % 12) + 1;
                    // Calculate year offset (0 for first 12 months, +1 for months 13-15)
                    var currentYear = parseInt(ayear) + Math.floor(i / 12);
                    cal += calendar(currentMonth, currentYear, options) + lf;
                }
            }
            else {
                // CASE 3: Current Month View (Default)
                cal += calendar(thismonth, thisyear, options);
                var next = getNext(thismonth, thisyear);
                cal += calendar(next.m, next.y, options, true); // Append next 2 weeks
            }
        }
        return cal + lf + lf + '</div>';

        // calendar function now accepts previewMode boolean
        function calendar(mnth, year, options, previewMode) {
            var month = createMonth(mnth, year, options);
            var blankdays = (firstDayInMonth(mnth, year) + 13 - WEEKFIN) % 7;
            return titleOfMonth(mnth, year) + createWeekHeading() +
                formatAsMonth(month, blankdays, previewMode);
        }

        function titleOfMonth(mth, year) {
            if (!!options.seperateYearHeading) {
                return '|>|>|>|' + centre(boldtitle + month_of_year[mth]) + '|<|<|<|' + lf;
            } else {
                return '|>|>|>|' + centre(boldtitle + month_of_year[mth] + '  ' + year) + '|<|<|<|' + lf;
            }
        }

        function titleOfYear(year) {
            return '|>|>|>|>|>|>|>|' + centre('!' + year) + '|<|<|<|<|<|<|<|' + lf;
        }
        function centre(x) { return ' ' + x + ' '; }

        function formatAsMonth(month, blankdays, previewMode) {
            var theday, blank = ['', '|', '||', '|||', '||||', '|||||', '||||||', '|||||||'];
            var cal = blank[blankdays];//pad out before first day of month
            var weekCount = 0;

            for (var i = 1; i < month.length; i++) {//first '0' month element is not used
                cal += '|' + month[i];
                theday = (i + blankdays - 1) % 7;
                if (theday == 6) {
                    cal += '|' + lf;
                    weekCount++;
                    // JANE MODIFIED: If showing preview, stop after 2 rows
                    if (previewMode && weekCount >= 2) return cal;
                }
            }
            if (theday !== 6) cal += blank[7 - theday] + lf;//pad out rest of week, if needed
            return cal;
        }
        function createWeekHeading() {
            var daystitle = [], weekdays = day_of_week.slice(0);
            // highlight today's day of week
            if (options.highlightThisDay == 'yes') weekdays[thisday] = '!' + weekdays[thisday];
            for (var i = 0; i < weekdays.length; i++) daystitle[i] = centre(weekdays[(i + 1 + WEEKFIN) % 7]);
            return '|' + daystitle.join('|') + '|' + lf;
        }
        function daysInMonth(iMonth, iYear) {
            return 32 - new Date(iYear, iMonth - 1, 32).getDate();
        }
        function firstDayInMonth(iMonth, iYear) {
            return new Date(iYear, iMonth - 1, 1).getDay();
        }
    }

})();