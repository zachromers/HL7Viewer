// HL7 Segment and Field Definitions Database
const HL7_SEGMENTS = {
  "MSH": {
    name: "Message Header",
    fields: {
      1: { name: "Field Separator" },
      2: { name: "Encoding Characters" },
      3: {
        name: "Sending Application",
        components: { 1: "Namespace ID", 2: "Universal ID", 3: "Universal ID Type" }
      },
      4: {
        name: "Sending Facility",
        components: { 1: "Namespace ID", 2: "Universal ID", 3: "Universal ID Type" }
      },
      5: {
        name: "Receiving Application",
        components: { 1: "Namespace ID", 2: "Universal ID", 3: "Universal ID Type" }
      },
      6: {
        name: "Receiving Facility",
        components: { 1: "Namespace ID", 2: "Universal ID", 3: "Universal ID Type" }
      },
      7: {
        name: "Date/Time of Message",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      8: { name: "Security" },
      9: {
        name: "Message Type",
        components: { 1: "Message Code", 2: "Trigger Event", 3: "Message Structure" }
      },
      10: { name: "Message Control ID" },
      11: {
        name: "Processing ID",
        components: { 1: "Processing ID", 2: "Processing Mode" }
      },
      12: {
        name: "Version ID",
        components: { 1: "Version ID", 2: "Internationalization Code", 3: "International Version ID" }
      },
      13: { name: "Sequence Number" },
      14: { name: "Continuation Pointer" },
      15: { name: "Accept Acknowledgment Type" },
      16: { name: "Application Acknowledgment Type" },
      17: { name: "Country Code" },
      18: { name: "Character Set" },
      19: {
        name: "Principal Language of Message",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      20: { name: "Alternate Character Set Handling Scheme" },
      21: {
        name: "Message Profile Identifier",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      }
    }
  },

  "EVN": {
    name: "Event Type",
    fields: {
      1: { name: "Event Type Code" },
      2: {
        name: "Recorded Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      3: {
        name: "Date/Time Planned Event",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      4: { name: "Event Reason Code" },
      5: {
        name: "Operator ID",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      6: {
        name: "Event Occurred",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      7: {
        name: "Event Facility",
        components: { 1: "Namespace ID", 2: "Universal ID", 3: "Universal ID Type" }
      }
    }
  },

  "PID": {
    name: "Patient Identification",
    fields: {
      1: { name: "Set ID - PID" },
      2: {
        name: "Patient ID (External)",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      3: {
        name: "Patient Identifier List",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility", 7: "Effective Date", 8: "Expiration Date", 9: "Assigning Jurisdiction", 10: "Assigning Agency" }
      },
      4: {
        name: "Alternate Patient ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      5: {
        name: "Patient Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree", 7: "Name Type Code", 8: "Name Representation Code" }
      },
      6: {
        name: "Mother's Maiden Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      7: {
        name: "Date/Time of Birth",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      8: { name: "Administrative Sex" },
      9: {
        name: "Patient Alias",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      10: {
        name: "Race",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System", 4: "Alternate Identifier", 5: "Alternate Text", 6: "Name of Alternate Coding System" }
      },
      11: {
        name: "Patient Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type", 8: "Other Geographic Designation", 9: "County Code", 10: "Census Tract", 11: "Address Representation Code" }
      },
      12: { name: "County Code" },
      13: {
        name: "Phone Number - Home",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address", 5: "Country Code", 6: "Area Code", 7: "Local Number", 8: "Extension" }
      },
      14: {
        name: "Phone Number - Business",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address", 5: "Country Code", 6: "Area Code", 7: "Local Number", 8: "Extension" }
      },
      15: {
        name: "Primary Language",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      16: {
        name: "Marital Status",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      17: {
        name: "Religion",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      18: {
        name: "Patient Account Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      19: { name: "SSN Number - Patient" },
      20: {
        name: "Driver's License Number",
        components: { 1: "License Number", 2: "Issuing State", 3: "Expiration Date" }
      },
      21: {
        name: "Mother's Identifier",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      22: {
        name: "Ethnic Group",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      23: { name: "Birth Place" },
      24: { name: "Multiple Birth Indicator" },
      25: { name: "Birth Order" },
      26: {
        name: "Citizenship",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      27: {
        name: "Veterans Military Status",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      28: {
        name: "Nationality",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      29: {
        name: "Patient Death Date and Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      30: { name: "Patient Death Indicator" }
    }
  },

  "PD1": {
    name: "Patient Additional Demographic",
    fields: {
      1: {
        name: "Living Dependency",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      2: {
        name: "Living Arrangement",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      3: {
        name: "Patient Primary Facility",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number", 4: "Check Digit", 5: "Check Digit Scheme", 6: "Assigning Authority", 7: "Identifier Type Code", 8: "Assigning Facility" }
      },
      4: {
        name: "Patient Primary Care Provider Name & ID",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      5: { name: "Student Indicator" },
      6: { name: "Handicap" },
      7: { name: "Living Will Code" },
      8: { name: "Organ Donor Code" },
      9: { name: "Separate Bill" },
      10: {
        name: "Duplicate Patient",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      11: {
        name: "Publicity Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      12: { name: "Protection Indicator" }
    }
  },

  "NK1": {
    name: "Next of Kin",
    fields: {
      1: { name: "Set ID - NK1" },
      2: {
        name: "Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree", 7: "Name Type Code" }
      },
      3: {
        name: "Relationship",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      4: {
        name: "Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      5: {
        name: "Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address", 5: "Country Code", 6: "Area Code", 7: "Local Number", 8: "Extension" }
      },
      6: {
        name: "Business Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address", 5: "Country Code", 6: "Area Code", 7: "Local Number", 8: "Extension" }
      },
      7: {
        name: "Contact Role",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      8: {
        name: "Start Date",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      9: {
        name: "End Date",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      10: { name: "Next of Kin / Associated Parties Job Title" },
      11: {
        name: "Next of Kin / Associated Parties Job Code/Class",
        components: { 1: "Job Code", 2: "Job Class" }
      },
      12: {
        name: "Next of Kin / Associated Parties Employee Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      13: {
        name: "Organization Name - NK1",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      14: {
        name: "Marital Status",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      15: { name: "Administrative Sex" },
      16: {
        name: "Date/Time of Birth",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      17: {
        name: "Living Dependency",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      18: {
        name: "Ambulatory Status",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      19: {
        name: "Citizenship",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      20: {
        name: "Primary Language",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      21: {
        name: "Living Arrangement",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      22: {
        name: "Publicity Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      23: { name: "Protection Indicator" },
      24: { name: "Student Indicator" },
      25: {
        name: "Religion",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      26: {
        name: "Mother's Maiden Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      27: {
        name: "Nationality",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      28: {
        name: "Ethnic Group",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      29: {
        name: "Contact Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      30: {
        name: "Contact Person's Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      31: {
        name: "Contact Person's Telephone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      32: {
        name: "Contact Person's Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      33: {
        name: "Next of Kin/Associated Party's Identifiers",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      34: { name: "Job Status" },
      35: {
        name: "Race",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      36: { name: "Handicap" },
      37: { name: "Contact Person Social Security Number" }
    }
  },

  "PV1": {
    name: "Patient Visit",
    fields: {
      1: { name: "Set ID - PV1" },
      2: { name: "Patient Class" },
      3: {
        name: "Assigned Patient Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility", 5: "Location Status", 6: "Person Location Type", 7: "Building", 8: "Floor", 9: "Location Description" }
      },
      4: { name: "Admission Type" },
      5: {
        name: "Preadmit Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      6: {
        name: "Prior Patient Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility", 5: "Location Status", 6: "Person Location Type", 7: "Building", 8: "Floor" }
      },
      7: {
        name: "Attending Doctor",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      8: {
        name: "Referring Doctor",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      9: {
        name: "Consulting Doctor",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      10: { name: "Hospital Service" },
      11: {
        name: "Temporary Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility", 5: "Location Status", 6: "Person Location Type", 7: "Building", 8: "Floor" }
      },
      12: { name: "Preadmit Test Indicator" },
      13: { name: "Re-admission Indicator" },
      14: { name: "Admit Source" },
      15: { name: "Ambulatory Status" },
      16: { name: "VIP Indicator" },
      17: {
        name: "Admitting Doctor",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      18: { name: "Patient Type" },
      19: {
        name: "Visit Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      20: {
        name: "Financial Class",
        components: { 1: "Financial Class Code", 2: "Effective Date" }
      },
      21: { name: "Charge Price Indicator" },
      22: { name: "Courtesy Code" },
      23: { name: "Credit Rating" },
      24: { name: "Contract Code" },
      25: { name: "Contract Effective Date" },
      26: { name: "Contract Amount" },
      27: { name: "Contract Period" },
      28: { name: "Interest Code" },
      29: { name: "Transfer to Bad Debt Code" },
      30: { name: "Transfer to Bad Debt Date" },
      31: { name: "Bad Debt Agency Code" },
      32: { name: "Bad Debt Transfer Amount" },
      33: { name: "Bad Debt Recovery Amount" },
      34: { name: "Delete Account Indicator" },
      35: { name: "Delete Account Date" },
      36: { name: "Discharge Disposition" },
      37: {
        name: "Discharged to Location",
        components: { 1: "Discharge Location", 2: "Effective Date" }
      },
      38: {
        name: "Diet Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      39: { name: "Servicing Facility" },
      40: { name: "Bed Status" },
      41: { name: "Account Status" },
      42: {
        name: "Pending Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility", 5: "Location Status", 6: "Person Location Type", 7: "Building", 8: "Floor" }
      },
      43: {
        name: "Prior Temporary Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility", 5: "Location Status", 6: "Person Location Type", 7: "Building", 8: "Floor" }
      },
      44: {
        name: "Admit Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      45: {
        name: "Discharge Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      46: { name: "Current Patient Balance" },
      47: { name: "Total Charges" },
      48: { name: "Total Adjustments" },
      49: { name: "Total Payments" },
      50: {
        name: "Alternate Visit ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      51: { name: "Visit Indicator" },
      52: {
        name: "Other Healthcare Provider",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      }
    }
  },

  "PV2": {
    name: "Patient Visit - Additional Info",
    fields: {
      1: {
        name: "Prior Pending Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility" }
      },
      2: {
        name: "Accommodation Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      3: {
        name: "Admit Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      4: {
        name: "Transfer Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      5: { name: "Patient Valuables" },
      6: { name: "Patient Valuables Location" },
      7: { name: "Visit User Code" },
      8: {
        name: "Expected Admit Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      9: {
        name: "Expected Discharge Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      10: { name: "Estimated Length of Inpatient Stay" },
      11: { name: "Actual Length of Inpatient Stay" },
      12: { name: "Visit Description" },
      13: {
        name: "Referral Source Code",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name" }
      },
      14: { name: "Previous Service Date" },
      15: { name: "Employment Illness Related Indicator" },
      16: { name: "Purge Status Code" },
      17: { name: "Purge Status Date" },
      18: { name: "Special Program Code" },
      19: { name: "Retention Indicator" },
      20: { name: "Expected Number of Insurance Plans" },
      21: { name: "Visit Publicity Code" },
      22: { name: "Visit Protection Indicator" },
      23: {
        name: "Clinic Organization Name",
        components: { 1: "Organization Name", 2: "Organization Name Type Code" }
      },
      24: { name: "Patient Status Code" },
      25: { name: "Visit Priority Code" },
      26: { name: "Previous Treatment Date" },
      27: { name: "Expected Discharge Disposition" },
      28: { name: "Signature on File Date" },
      29: { name: "First Similar Illness Date" },
      30: {
        name: "Patient Charge Adjustment Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      31: { name: "Recurring Service Code" },
      32: { name: "Billing Media Code" },
      33: {
        name: "Expected Surgery Date and Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      34: { name: "Military Partnership Code" },
      35: { name: "Military Non-Availability Code" },
      36: { name: "Newborn Baby Indicator" },
      37: { name: "Baby Detained Indicator" }
    }
  },

  "ORC": {
    name: "Common Order",
    fields: {
      1: { name: "Order Control" },
      2: {
        name: "Placer Order Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      3: {
        name: "Filler Order Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      4: {
        name: "Placer Group Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      5: { name: "Order Status" },
      6: { name: "Response Flag" },
      7: {
        name: "Quantity/Timing",
        components: { 1: "Quantity", 2: "Interval", 3: "Duration", 4: "Start Date/Time", 5: "End Date/Time", 6: "Priority", 7: "Condition", 8: "Text", 9: "Conjunction", 10: "Order Sequencing" }
      },
      8: {
        name: "Parent",
        components: { 1: "Placer Assigned Identifier", 2: "Filler Assigned Identifier" }
      },
      9: {
        name: "Date/Time of Transaction",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      10: {
        name: "Entered By",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      11: {
        name: "Verified By",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      12: {
        name: "Ordering Provider",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      13: {
        name: "Enterer's Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility", 5: "Location Status", 6: "Person Location Type", 7: "Building", 8: "Floor" }
      },
      14: {
        name: "Call Back Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      15: {
        name: "Order Effective Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      16: {
        name: "Order Control Code Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      17: {
        name: "Entering Organization",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      18: {
        name: "Entering Device",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      19: {
        name: "Action By",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      20: {
        name: "Advanced Beneficiary Notice Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      21: {
        name: "Ordering Facility Name",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      22: {
        name: "Ordering Facility Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      23: {
        name: "Ordering Facility Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      24: {
        name: "Ordering Provider Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      25: {
        name: "Order Status Modifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "OBR": {
    name: "Observation Request",
    fields: {
      1: { name: "Set ID - OBR" },
      2: {
        name: "Placer Order Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      3: {
        name: "Filler Order Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      4: {
        name: "Universal Service Identifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System", 4: "Alternate Identifier", 5: "Alternate Text", 6: "Name of Alternate Coding System" }
      },
      5: { name: "Priority - OBR" },
      6: {
        name: "Requested Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      7: {
        name: "Observation Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      8: {
        name: "Observation End Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      9: {
        name: "Collection Volume",
        components: { 1: "Quantity", 2: "Units" }
      },
      10: {
        name: "Collector Identifier",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      11: { name: "Specimen Action Code" },
      12: {
        name: "Danger Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      13: { name: "Relevant Clinical Information" },
      14: {
        name: "Specimen Received Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      15: {
        name: "Specimen Source",
        components: { 1: "Specimen Source Name", 2: "Additives", 3: "Specimen Collection Method", 4: "Body Site", 5: "Site Modifier", 6: "Collection Method Modifier Code" }
      },
      16: {
        name: "Ordering Provider",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree", 8: "Source Table", 9: "Assigning Authority" }
      },
      17: {
        name: "Order Callback Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      18: { name: "Placer Field 1" },
      19: { name: "Placer Field 2" },
      20: { name: "Filler Field 1" },
      21: { name: "Filler Field 2" },
      22: {
        name: "Results Rpt/Status Chng - Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      23: {
        name: "Charge to Practice",
        components: { 1: "Monetary Amount", 2: "Charge Code" }
      },
      24: { name: "Diagnostic Serv Sect ID" },
      25: { name: "Result Status" },
      26: {
        name: "Parent Result",
        components: { 1: "Parent Observation Identifier", 2: "Parent Observation Sub-identifier", 3: "Parent Observation Value Descriptor" }
      },
      27: {
        name: "Quantity/Timing",
        components: { 1: "Quantity", 2: "Interval", 3: "Duration", 4: "Start Date/Time", 5: "End Date/Time", 6: "Priority", 7: "Condition", 8: "Text", 9: "Conjunction", 10: "Order Sequencing" }
      },
      28: {
        name: "Result Copies To",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      29: {
        name: "Parent",
        components: { 1: "Placer Assigned Identifier", 2: "Filler Assigned Identifier" }
      },
      30: { name: "Transportation Mode" },
      31: {
        name: "Reason for Study",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      32: {
        name: "Principal Result Interpreter",
        components: { 1: "Name", 2: "Start Date/Time", 3: "End Date/Time", 4: "Point of Care", 5: "Room", 6: "Bed", 7: "Facility", 8: "Location Status", 9: "Patient Location Type", 10: "Building", 11: "Floor" }
      },
      33: {
        name: "Assistant Result Interpreter",
        components: { 1: "Name", 2: "Start Date/Time", 3: "End Date/Time", 4: "Point of Care" }
      },
      34: {
        name: "Technician",
        components: { 1: "Name", 2: "Start Date/Time", 3: "End Date/Time", 4: "Point of Care" }
      },
      35: {
        name: "Transcriptionist",
        components: { 1: "Name", 2: "Start Date/Time", 3: "End Date/Time", 4: "Point of Care" }
      },
      36: {
        name: "Scheduled Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      37: { name: "Number of Sample Containers" },
      38: {
        name: "Transport Logistics of Collected Sample",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      39: {
        name: "Collector's Comment",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      40: {
        name: "Transport Arrangement Responsibility",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      41: { name: "Transport Arranged" },
      42: { name: "Escort Required" },
      43: {
        name: "Planned Patient Transport Comment",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      44: {
        name: "Procedure Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      45: {
        name: "Procedure Code Modifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      46: {
        name: "Placer Supplemental Service Information",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      47: {
        name: "Filler Supplemental Service Information",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "OBX": {
    name: "Observation/Result",
    fields: {
      1: { name: "Set ID - OBX" },
      2: { name: "Value Type" },
      3: {
        name: "Observation Identifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System", 4: "Alternate Identifier", 5: "Alternate Text", 6: "Name of Alternate Coding System" }
      },
      4: { name: "Observation Sub-ID" },
      5: { name: "Observation Value" },
      6: {
        name: "Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      7: { name: "References Range" },
      8: { name: "Abnormal Flags" },
      9: { name: "Probability" },
      10: { name: "Nature of Abnormal Test" },
      11: { name: "Observation Result Status" },
      12: {
        name: "Effective Date of Reference Range",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      13: { name: "User Defined Access Checks" },
      14: {
        name: "Date/Time of the Observation",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      15: {
        name: "Producer's ID",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      16: {
        name: "Responsible Observer",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      17: {
        name: "Observation Method",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      18: {
        name: "Equipment Instance Identifier",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      19: {
        name: "Date/Time of the Analysis",
        components: { 1: "Time", 2: "Degree of Precision" }
      }
    }
  },

  "DG1": {
    name: "Diagnosis",
    fields: {
      1: { name: "Set ID - DG1" },
      2: { name: "Diagnosis Coding Method" },
      3: {
        name: "Diagnosis Code - DG1",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System", 4: "Alternate Identifier", 5: "Alternate Text", 6: "Name of Alternate Coding System" }
      },
      4: { name: "Diagnosis Description" },
      5: {
        name: "Diagnosis Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      6: { name: "Diagnosis Type" },
      7: {
        name: "Major Diagnostic Category",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      8: {
        name: "Diagnostic Related Group",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      9: { name: "DRG Approval Indicator" },
      10: { name: "DRG Grouper Review Code" },
      11: {
        name: "Outlier Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      12: { name: "Outlier Days" },
      13: {
        name: "Outlier Cost",
        components: { 1: "Price", 2: "Price Type", 3: "From Value", 4: "To Value", 5: "Range Units", 6: "Range Type" }
      },
      14: { name: "Grouper Version And Type" },
      15: { name: "Diagnosis Priority" },
      16: {
        name: "Diagnosing Clinician",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      17: { name: "Diagnosis Classification" },
      18: { name: "Confidential Indicator" },
      19: {
        name: "Attestation Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      }
    }
  },

  "AL1": {
    name: "Patient Allergy Information",
    fields: {
      1: { name: "Set ID - AL1" },
      2: {
        name: "Allergen Type Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      3: {
        name: "Allergen Code/Mnemonic/Description",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System", 4: "Alternate Identifier", 5: "Alternate Text", 6: "Name of Alternate Coding System" }
      },
      4: {
        name: "Allergy Severity Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      5: { name: "Allergy Reaction Code" },
      6: { name: "Identification Date" }
    }
  },

  "IN1": {
    name: "Insurance",
    fields: {
      1: { name: "Set ID - IN1" },
      2: {
        name: "Insurance Plan ID",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      3: {
        name: "Insurance Company ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      4: {
        name: "Insurance Company Name",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      5: {
        name: "Insurance Company Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      6: {
        name: "Insurance Co Contact Person",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      7: {
        name: "Insurance Co Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      8: { name: "Group Number" },
      9: {
        name: "Group Name",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      10: {
        name: "Insured's Group Emp ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      11: {
        name: "Insured's Group Emp Name",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      12: { name: "Plan Effective Date" },
      13: { name: "Plan Expiration Date" },
      14: {
        name: "Authorization Information",
        components: { 1: "Authorization Number", 2: "Date", 3: "Source" }
      },
      15: { name: "Plan Type" },
      16: {
        name: "Name Of Insured",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      17: { name: "Insured's Relationship To Patient" },
      18: {
        name: "Insured's Date Of Birth",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      19: {
        name: "Insured's Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      20: { name: "Assignment Of Benefits" },
      21: { name: "Coordination Of Benefits" },
      22: { name: "Coord Of Ben. Priority" },
      23: { name: "Notice Of Admission Flag" },
      24: { name: "Notice Of Admission Date" },
      25: { name: "Report Of Eligibility Flag" },
      26: { name: "Report Of Eligibility Date" },
      27: { name: "Release Information Code" },
      28: { name: "Pre-Admit Cert (PAC)" },
      29: {
        name: "Verification Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      30: {
        name: "Verification By",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      31: { name: "Type Of Agreement Code" },
      32: { name: "Billing Status" },
      33: { name: "Lifetime Reserve Days" },
      34: { name: "Delay Before L.R. Day" },
      35: { name: "Company Plan Code" },
      36: { name: "Policy Number" },
      37: {
        name: "Policy Deductible",
        components: { 1: "Price", 2: "Price Type" }
      },
      38: {
        name: "Policy Limit - Amount",
        components: { 1: "Price", 2: "Price Type" }
      },
      39: { name: "Policy Limit - Days" },
      40: {
        name: "Room Rate - Semi-Private",
        components: { 1: "Price", 2: "Price Type" }
      },
      41: {
        name: "Room Rate - Private",
        components: { 1: "Price", 2: "Price Type" }
      },
      42: {
        name: "Insured's Employment Status",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      43: { name: "Insured's Administrative Sex" },
      44: {
        name: "Insured's Employer's Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      45: { name: "Verification Status" },
      46: { name: "Prior Insurance Plan ID" },
      47: { name: "Coverage Type" },
      48: { name: "Handicap" },
      49: {
        name: "Insured's ID Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      }
    }
  },

  "IN2": {
    name: "Insurance Additional Info",
    fields: {
      1: {
        name: "Insured's Employee ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      2: { name: "Insured's Social Security Number" },
      3: {
        name: "Insured's Employer's Name and ID",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      4: { name: "Employer Information Data" },
      5: { name: "Mail Claim Party" },
      6: { name: "Medicare Health Ins Card Number" },
      7: {
        name: "Medicaid Case Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      8: { name: "Medicaid Case Number" },
      9: {
        name: "Military Sponsor Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      10: { name: "Military ID Number" },
      11: {
        name: "Dependent Of Military Recipient",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      12: { name: "Military Organization" },
      13: { name: "Military Station" },
      14: { name: "Military Service" },
      15: { name: "Military Rank/Grade" },
      16: { name: "Military Status" },
      17: { name: "Military Retire Date" },
      18: { name: "Military Non-Avail Cert On File" },
      19: { name: "Baby Coverage" },
      20: { name: "Combine Baby Bill" },
      21: { name: "Blood Deductible" },
      22: {
        name: "Special Coverage Approval Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      23: { name: "Special Coverage Approval Title" },
      24: { name: "Non-Covered Insurance Code" },
      25: {
        name: "Payor ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      26: {
        name: "Payor Subscriber ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      27: { name: "Eligibility Source" },
      28: {
        name: "Room Coverage Type/Amount",
        components: { 1: "Room Type", 2: "Amount Type", 3: "Coverage Amount" }
      },
      29: {
        name: "Policy Type/Amount",
        components: { 1: "Policy Type", 2: "Amount Class", 3: "Amount" }
      },
      30: {
        name: "Daily Deductible",
        components: { 1: "Delay Days", 2: "Amount", 3: "Number of Days" }
      },
      31: { name: "Living Dependency" },
      32: { name: "Ambulatory Status" },
      33: { name: "Citizenship" },
      34: {
        name: "Primary Language",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      35: { name: "Living Arrangement" },
      36: {
        name: "Publicity Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      37: { name: "Protection Indicator" },
      38: { name: "Student Indicator" },
      39: {
        name: "Religion",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      40: {
        name: "Mother's Maiden Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      41: {
        name: "Nationality",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      42: {
        name: "Ethnic Group",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      43: {
        name: "Marital Status",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      44: { name: "Insured's Employment Start Date" },
      45: { name: "Employment Stop Date" },
      46: { name: "Job Title" },
      47: {
        name: "Job Code/Class",
        components: { 1: "Job Code", 2: "Job Class" }
      },
      48: { name: "Job Status" },
      49: {
        name: "Employer Contact Person Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      50: {
        name: "Employer Contact Person Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      51: { name: "Employer Contact Reason" },
      52: {
        name: "Insured's Contact Person's Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      53: {
        name: "Insured's Contact Person Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      54: { name: "Insured's Contact Person Reason" },
      55: { name: "Relationship to the Patient Start Date" },
      56: { name: "Relationship to the Patient Stop Date" },
      57: { name: "Insurance Co. Contact Reason" },
      58: {
        name: "Insurance Co Contact Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      59: { name: "Policy Scope" },
      60: { name: "Policy Source" },
      61: {
        name: "Patient Member Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      62: { name: "Guarantor's Relationship to Insured" },
      63: {
        name: "Insured's Phone Number - Home",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      64: {
        name: "Insured's Employer Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      65: {
        name: "Military Handicapped Program",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      66: { name: "Suspend Flag" },
      67: { name: "Copay Limit Flag" },
      68: { name: "Stoploss Limit Flag" },
      69: {
        name: "Insured Organization Name and ID",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      70: {
        name: "Insured Employer Organization Name and ID",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      71: {
        name: "Race",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      72: {
        name: "CMS Patient's Relationship to Insured",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "GT1": {
    name: "Guarantor",
    fields: {
      1: { name: "Set ID - GT1" },
      2: {
        name: "Guarantor Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      3: {
        name: "Guarantor Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      4: {
        name: "Guarantor Spouse Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      5: {
        name: "Guarantor Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      6: {
        name: "Guarantor Ph Num - Home",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      7: {
        name: "Guarantor Ph Num - Business",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      8: {
        name: "Guarantor Date/Time Of Birth",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      9: { name: "Guarantor Administrative Sex" },
      10: { name: "Guarantor Type" },
      11: { name: "Guarantor Relationship" },
      12: { name: "Guarantor SSN" },
      13: { name: "Guarantor Date - Begin" },
      14: { name: "Guarantor Date - End" },
      15: { name: "Guarantor Priority" },
      16: {
        name: "Guarantor Employer Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      17: {
        name: "Guarantor Employer Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      18: {
        name: "Guarantor Employer Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      19: {
        name: "Guarantor Employee ID Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      20: { name: "Guarantor Employment Status" },
      21: {
        name: "Guarantor Organization Name",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      22: { name: "Guarantor Billing Hold Flag" },
      23: {
        name: "Guarantor Credit Rating Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      24: {
        name: "Guarantor Death Date And Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      25: { name: "Guarantor Death Flag" },
      26: {
        name: "Guarantor Charge Adjustment Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      27: {
        name: "Guarantor Household Annual Income",
        components: { 1: "Price", 2: "Price Type" }
      },
      28: { name: "Guarantor Household Size" },
      29: {
        name: "Guarantor Employer ID Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      30: {
        name: "Guarantor Marital Status Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      31: { name: "Guarantor Hire Effective Date" },
      32: { name: "Employment Stop Date" },
      33: { name: "Living Dependency" },
      34: { name: "Ambulatory Status" },
      35: { name: "Citizenship" },
      36: {
        name: "Primary Language",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      37: { name: "Living Arrangement" },
      38: {
        name: "Publicity Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      39: { name: "Protection Indicator" },
      40: { name: "Student Indicator" },
      41: {
        name: "Religion",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      42: {
        name: "Mother's Maiden Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      43: {
        name: "Nationality",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      44: {
        name: "Ethnic Group",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      45: {
        name: "Contact Person's Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      },
      46: {
        name: "Contact Person's Telephone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      47: {
        name: "Contact Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      48: { name: "Contact Relationship" },
      49: { name: "Job Title" },
      50: {
        name: "Job Code/Class",
        components: { 1: "Job Code", 2: "Job Class" }
      },
      51: {
        name: "Guarantor Employer's Organization Name",
        components: { 1: "Organization Name", 2: "Organization Name Type Code", 3: "ID Number" }
      },
      52: { name: "Handicap" },
      53: { name: "Job Status" },
      54: {
        name: "Guarantor Financial Class",
        components: { 1: "Financial Class Code", 2: "Effective Date" }
      },
      55: {
        name: "Guarantor Race",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "NTE": {
    name: "Notes and Comments",
    fields: {
      1: { name: "Set ID - NTE" },
      2: { name: "Source of Comment" },
      3: { name: "Comment" },
      4: {
        name: "Comment Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "RXA": {
    name: "Pharmacy/Treatment Administration",
    fields: {
      1: { name: "Give Sub-ID Counter" },
      2: { name: "Administration Sub-ID Counter" },
      3: {
        name: "Date/Time Start of Administration",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      4: {
        name: "Date/Time End of Administration",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      5: {
        name: "Administered Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System", 4: "Alternate Identifier", 5: "Alternate Text", 6: "Name of Alternate Coding System" }
      },
      6: { name: "Administered Amount" },
      7: {
        name: "Administered Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      8: {
        name: "Administered Dosage Form",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      9: {
        name: "Administration Notes",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      10: {
        name: "Administering Provider",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      11: {
        name: "Administered-at Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility", 5: "Location Status", 6: "Patient Location Type", 7: "Building", 8: "Floor", 9: "Address" }
      },
      12: { name: "Administered Per (Time Unit)" },
      13: { name: "Administered Strength" },
      14: {
        name: "Administered Strength Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      15: { name: "Substance Lot Number" },
      16: {
        name: "Substance Expiration Date",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      17: {
        name: "Substance Manufacturer Name",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      18: {
        name: "Substance/Treatment Refusal Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      19: {
        name: "Indication",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      20: { name: "Completion Status" },
      21: { name: "Action Code - RXA" },
      22: {
        name: "System Entry Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      23: { name: "Administered Drug Strength Volume" },
      24: {
        name: "Administered Drug Strength Volume Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      25: {
        name: "Administered Barcode Identifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      26: { name: "Pharmacy Order Type" }
    }
  },

  "RXR": {
    name: "Pharmacy/Treatment Route",
    fields: {
      1: {
        name: "Route",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      2: {
        name: "Administration Site",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      3: {
        name: "Administration Device",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      4: {
        name: "Administration Method",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      5: {
        name: "Routing Instruction",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      6: {
        name: "Administration Site Modifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "SCH": {
    name: "Scheduling Activity Information",
    fields: {
      1: {
        name: "Placer Appointment ID",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      2: {
        name: "Filler Appointment ID",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      3: { name: "Occurrence Number" },
      4: {
        name: "Placer Group Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      5: {
        name: "Schedule ID",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      6: {
        name: "Event Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      7: {
        name: "Appointment Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      8: {
        name: "Appointment Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      9: { name: "Appointment Duration" },
      10: {
        name: "Appointment Duration Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      11: {
        name: "Appointment Timing Quantity",
        components: { 1: "Quantity", 2: "Interval", 3: "Duration", 4: "Start Date/Time", 5: "End Date/Time", 6: "Priority" }
      },
      12: {
        name: "Placer Contact Person",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      13: {
        name: "Placer Contact Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      14: {
        name: "Placer Contact Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country" }
      },
      15: {
        name: "Placer Contact Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility" }
      },
      16: {
        name: "Filler Contact Person",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      17: {
        name: "Filler Contact Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      18: {
        name: "Filler Contact Address",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country" }
      },
      19: {
        name: "Filler Contact Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility" }
      },
      20: {
        name: "Entered By Person",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      21: {
        name: "Entered By Phone Number",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      },
      22: {
        name: "Entered By Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility" }
      },
      23: {
        name: "Parent Placer Appointment ID",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      24: {
        name: "Parent Filler Appointment ID",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      25: {
        name: "Filler Status Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      26: {
        name: "Placer Order Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      27: {
        name: "Filler Order Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      }
    }
  },

  "TQ1": {
    name: "Timing/Quantity",
    fields: {
      1: { name: "Set ID - TQ1" },
      2: {
        name: "Quantity",
        components: { 1: "Quantity", 2: "Units" }
      },
      3: {
        name: "Repeat Pattern",
        components: { 1: "Repeat Pattern Code", 2: "Calendar Alignment", 3: "Phase Range Begin Value", 4: "Phase Range End Value", 5: "Period Quantity", 6: "Period Units" }
      },
      4: {
        name: "Explicit Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      5: {
        name: "Relative Time and Units",
        components: { 1: "Quantity", 2: "Units" }
      },
      6: {
        name: "Service Duration",
        components: { 1: "Quantity", 2: "Units" }
      },
      7: {
        name: "Start date/time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      8: {
        name: "End date/time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      9: {
        name: "Priority",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      10: {
        name: "Condition text",
        components: { 1: "Text" }
      },
      11: {
        name: "Text instruction",
        components: { 1: "Text" }
      },
      12: { name: "Conjunction" },
      13: {
        name: "Occurrence duration",
        components: { 1: "Quantity", 2: "Units" }
      },
      14: { name: "Total occurrences" }
    }
  },

  "AIS": {
    name: "Appointment Information - Service",
    fields: {
      1: { name: "Set ID - AIS" },
      2: { name: "Segment Action Code" },
      3: {
        name: "Universal Service Identifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      4: {
        name: "Start Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      5: { name: "Start Date/Time Offset" },
      6: {
        name: "Start Date/Time Offset Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      7: { name: "Duration" },
      8: {
        name: "Duration Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      9: { name: "Allow Substitution Code" },
      10: {
        name: "Filler Status Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      11: {
        name: "Placer Supplemental Service Information",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      12: {
        name: "Filler Supplemental Service Information",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "AIL": {
    name: "Appointment Information - Location",
    fields: {
      1: { name: "Set ID - AIL" },
      2: { name: "Segment Action Code" },
      3: {
        name: "Location Resource ID",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility" }
      },
      4: {
        name: "Location Type - AIL",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      5: {
        name: "Location Group",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      6: {
        name: "Start Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      7: { name: "Start Date/Time Offset" },
      8: {
        name: "Start Date/Time Offset Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      9: { name: "Duration" },
      10: {
        name: "Duration Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      11: { name: "Allow Substitution Code" },
      12: {
        name: "Filler Status Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "AIP": {
    name: "Appointment Information - Personnel",
    fields: {
      1: { name: "Set ID - AIP" },
      2: { name: "Segment Action Code" },
      3: {
        name: "Personnel Resource ID",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      4: {
        name: "Resource Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      5: {
        name: "Resource Group",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      6: {
        name: "Start Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      7: { name: "Start Date/Time Offset" },
      8: {
        name: "Start Date/Time Offset Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      9: { name: "Duration" },
      10: {
        name: "Duration Units",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      11: { name: "Allow Substitution Code" },
      12: {
        name: "Filler Status Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "MSA": {
    name: "Message Acknowledgment",
    fields: {
      1: { name: "Acknowledgment Code" },
      2: { name: "Message Control ID" },
      3: { name: "Text Message" },
      4: { name: "Expected Sequence Number" },
      5: { name: "Delayed Acknowledgment Type" },
      6: {
        name: "Error Condition",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "ERR": {
    name: "Error",
    fields: {
      1: {
        name: "Error Code and Location",
        components: { 1: "Segment ID", 2: "Sequence", 3: "Field Position", 4: "Code Identifying Error" }
      },
      2: {
        name: "Error Location",
        components: { 1: "Segment ID", 2: "Segment Sequence", 3: "Field Position", 4: "Field Repetition", 5: "Component Number", 6: "Sub-Component Number" }
      },
      3: {
        name: "HL7 Error Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      4: { name: "Severity" },
      5: {
        name: "Application Error Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      6: { name: "Application Error Parameter" },
      7: { name: "Diagnostic Information" },
      8: { name: "User Message" },
      9: { name: "Inform Person Indicator" },
      10: {
        name: "Override Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      11: {
        name: "Override Reason Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      12: {
        name: "Help Desk Contact Point",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      }
    }
  },

  "QRD": {
    name: "Query Definition",
    fields: {
      1: {
        name: "Query Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      2: { name: "Query Format Code" },
      3: { name: "Query Priority" },
      4: { name: "Query ID" },
      5: { name: "Deferred Response Type" },
      6: {
        name: "Deferred Response Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      7: {
        name: "Quantity Limited Request",
        components: { 1: "Quantity", 2: "Units" }
      },
      8: {
        name: "Who Subject Filter",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      9: {
        name: "What Subject Filter",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      10: {
        name: "What Department Data Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      11: {
        name: "What Data Code Value Qual",
        components: { 1: "First Data Code Value", 2: "Last Data Code Value" }
      },
      12: { name: "Query Results Level" }
    }
  },

  "QRF": {
    name: "Query Filter",
    fields: {
      1: { name: "Where Subject Filter" },
      2: {
        name: "When Data Start Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      3: {
        name: "When Data End Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      4: { name: "What User Qualifier" },
      5: { name: "Other QRY Subject Filter" },
      6: { name: "Which Date/Time Qualifier" },
      7: { name: "Which Date/Time Status Qualifier" },
      8: { name: "Date/Time Selection Qualifier" },
      9: {
        name: "When Quantity/Timing Qualifier",
        components: { 1: "Quantity", 2: "Interval", 3: "Duration", 4: "Start Date/Time", 5: "End Date/Time", 6: "Priority" }
      },
      10: { name: "Search Confidence Threshold" }
    }
  },

  "MRG": {
    name: "Merge Patient Information",
    fields: {
      1: {
        name: "Prior Patient Identifier List",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      2: {
        name: "Prior Alternate Patient ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      3: {
        name: "Prior Patient Account Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      4: {
        name: "Prior Patient ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      5: {
        name: "Prior Visit Number",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      6: {
        name: "Prior Alternate Visit ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      7: {
        name: "Prior Patient Name",
        components: { 1: "Family Name", 2: "Given Name", 3: "Second Name", 4: "Suffix", 5: "Prefix", 6: "Degree" }
      }
    }
  },

  "FT1": {
    name: "Financial Transaction",
    fields: {
      1: { name: "Set ID - FT1" },
      2: { name: "Transaction ID" },
      3: { name: "Transaction Batch ID" },
      4: {
        name: "Transaction Date",
        components: { 1: "Range Start Date/Time", 2: "Range End Date/Time" }
      },
      5: {
        name: "Transaction Posting Date",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      6: { name: "Transaction Type" },
      7: {
        name: "Transaction Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      8: { name: "Transaction Description" },
      9: { name: "Transaction Description - Alt" },
      10: { name: "Transaction Quantity" },
      11: {
        name: "Transaction Amount - Extended",
        components: { 1: "Price", 2: "Price Type" }
      },
      12: {
        name: "Transaction Amount - Unit",
        components: { 1: "Price", 2: "Price Type" }
      },
      13: {
        name: "Department Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      14: {
        name: "Insurance Plan ID",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      15: {
        name: "Insurance Amount",
        components: { 1: "Price", 2: "Price Type" }
      },
      16: {
        name: "Assigned Patient Location",
        components: { 1: "Point of Care", 2: "Room", 3: "Bed", 4: "Facility" }
      },
      17: { name: "Fee Schedule" },
      18: { name: "Patient Type" },
      19: {
        name: "Diagnosis Code - FT1",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      20: {
        name: "Performed By Code",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      21: {
        name: "Ordered By Code",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      22: {
        name: "Unit Cost",
        components: { 1: "Price", 2: "Price Type" }
      },
      23: {
        name: "Filler Order Number",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      24: {
        name: "Entered By Code",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      25: {
        name: "Procedure Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      26: {
        name: "Procedure Code Modifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      27: {
        name: "Advanced Beneficiary Notice Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      28: {
        name: "Medically Necessary Duplicate Procedure Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      29: {
        name: "NDC Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      30: {
        name: "Payment Reference ID",
        components: { 1: "ID Number", 2: "Check Digit", 3: "Check Digit Scheme", 4: "Assigning Authority", 5: "Identifier Type Code", 6: "Assigning Facility" }
      },
      31: { name: "Transaction Reference Key" }
    }
  },

  "PR1": {
    name: "Procedures",
    fields: {
      1: { name: "Set ID - PR1" },
      2: { name: "Procedure Coding Method" },
      3: {
        name: "Procedure Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      4: { name: "Procedure Description" },
      5: {
        name: "Procedure Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      6: { name: "Procedure Functional Type" },
      7: { name: "Procedure Minutes" },
      8: {
        name: "Anesthesiologist",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      9: { name: "Anesthesia Code" },
      10: { name: "Anesthesia Minutes" },
      11: {
        name: "Surgeon",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      12: {
        name: "Procedure Practitioner",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      13: {
        name: "Consent Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      14: { name: "Procedure Priority" },
      15: {
        name: "Associated Diagnosis Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      16: {
        name: "Procedure Code Modifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      17: { name: "Procedure DRG Type" },
      18: {
        name: "Tissue Type Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      19: {
        name: "Procedure Identifier",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      20: { name: "Procedure Action Code" }
    }
  },

  "ROL": {
    name: "Role",
    fields: {
      1: {
        name: "Role Instance ID",
        components: { 1: "Entity Identifier", 2: "Namespace ID", 3: "Universal ID", 4: "Universal ID Type" }
      },
      2: { name: "Action Code" },
      3: {
        name: "Role-ROL",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      4: {
        name: "Role Person",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      5: {
        name: "Role Begin Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      6: {
        name: "Role End Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      7: {
        name: "Role Duration",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      8: {
        name: "Role Action Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      9: {
        name: "Provider Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      10: {
        name: "Organization Unit Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      11: {
        name: "Office/Home Address/Birthplace",
        components: { 1: "Street Address", 2: "Other Designation", 3: "City", 4: "State", 5: "Zip Code", 6: "Country", 7: "Address Type" }
      },
      12: {
        name: "Phone",
        components: { 1: "Telephone Number", 2: "Telecommunication Use Code", 3: "Telecommunication Equipment Type", 4: "Email Address" }
      }
    }
  },

  "SPM": {
    name: "Specimen",
    fields: {
      1: { name: "Set ID - SPM" },
      2: {
        name: "Specimen ID",
        components: { 1: "Placer Assigned Identifier", 2: "Filler Assigned Identifier" }
      },
      3: {
        name: "Specimen Parent IDs",
        components: { 1: "Placer Assigned Identifier", 2: "Filler Assigned Identifier" }
      },
      4: {
        name: "Specimen Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      5: {
        name: "Specimen Type Modifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      6: {
        name: "Specimen Additives",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      7: {
        name: "Specimen Collection Method",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      8: {
        name: "Specimen Source Site",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      9: {
        name: "Specimen Source Site Modifier",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      10: {
        name: "Specimen Collection Site",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      11: {
        name: "Specimen Role",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      12: {
        name: "Specimen Collection Amount",
        components: { 1: "Quantity", 2: "Units" }
      },
      13: { name: "Grouped Specimen Count" },
      14: { name: "Specimen Description" },
      15: {
        name: "Specimen Handling Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      16: {
        name: "Specimen Risk Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      17: {
        name: "Specimen Collection Date/Time",
        components: { 1: "Range Start Date/Time", 2: "Range End Date/Time" }
      },
      18: {
        name: "Specimen Received Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      19: {
        name: "Specimen Expiration Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      20: { name: "Specimen Availability" },
      21: {
        name: "Specimen Reject Reason",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      22: {
        name: "Specimen Quality",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      23: {
        name: "Specimen Appropriateness",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      24: {
        name: "Specimen Condition",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      25: {
        name: "Specimen Current Quantity",
        components: { 1: "Quantity", 2: "Units" }
      },
      26: { name: "Number of Specimen Containers" },
      27: {
        name: "Container Type",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      28: {
        name: "Container Condition",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      29: {
        name: "Specimen Child Role",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      }
    }
  },

  "ACC": {
    name: "Accident",
    fields: {
      1: {
        name: "Accident Date/Time",
        components: { 1: "Time", 2: "Degree of Precision" }
      },
      2: {
        name: "Accident Code",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      3: { name: "Accident Location" },
      4: {
        name: "Auto Accident State",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      5: { name: "Accident Job Related Indicator" },
      6: { name: "Accident Death Indicator" },
      7: {
        name: "Entered By",
        components: { 1: "ID Number", 2: "Family Name", 3: "Given Name", 4: "Second Name", 5: "Suffix", 6: "Prefix", 7: "Degree" }
      },
      8: { name: "Accident Description" },
      9: { name: "Brought In By" },
      10: { name: "Police Notified Indicator" }
    }
  },

  "UB1": {
    name: "UB82",
    fields: {
      1: { name: "Set ID - UB1" },
      2: { name: "Blood Deductible" },
      3: { name: "Blood Furnished-Pints" },
      4: { name: "Blood Replaced-Pints" },
      5: { name: "Blood Not Replaced-Pints" },
      6: { name: "Co-Insurance Days" },
      7: { name: "Condition Code" },
      8: { name: "Covered Days" },
      9: { name: "Non Covered Days" },
      10: {
        name: "Value Amount & Code",
        components: { 1: "Value Code", 2: "Value Amount" }
      },
      11: { name: "Number Of Grace Days" },
      12: {
        name: "Special Program Indicator",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      13: {
        name: "PSRO/UR Approval Indicator",
        components: { 1: "Identifier", 2: "Text", 3: "Name of Coding System" }
      },
      14: { name: "PSRO/UR Approved Stay-Fm" },
      15: { name: "PSRO/UR Approved Stay-To" },
      16: {
        name: "Occurrence",
        components: { 1: "Occurrence Code", 2: "Occurrence Date" }
      },
      17: {
        name: "Occurrence Span",
        components: { 1: "Occurrence Span Code", 2: "Occurrence Span Start Date", 3: "Occurrence Span Stop Date" }
      },
      18: { name: "Occur Span Start Date" },
      19: { name: "Occur Span End Date" },
      20: { name: "UB-82 Locator 2" },
      21: { name: "UB-82 Locator 9" },
      22: { name: "UB-82 Locator 27" },
      23: { name: "UB-82 Locator 45" }
    }
  },

  "UB2": {
    name: "UB92 Data",
    fields: {
      1: { name: "Set ID - UB2" },
      2: { name: "Co-Insurance Days" },
      3: { name: "Condition Code" },
      4: { name: "Covered Days" },
      5: { name: "Non-Covered Days" },
      6: {
        name: "Value Amount & Code",
        components: { 1: "Value Code", 2: "Value Amount" }
      },
      7: {
        name: "Occurrence Code & Date",
        components: { 1: "Occurrence Code", 2: "Occurrence Date" }
      },
      8: {
        name: "Occurrence Span Code/Dates",
        components: { 1: "Occurrence Span Code", 2: "Occurrence Span Start Date", 3: "Occurrence Span Stop Date" }
      },
      9: { name: "UB92 Locator 2 (State)" },
      10: { name: "UB92 Locator 11 (State)" },
      11: { name: "UB92 Locator 31 (National)" },
      12: { name: "Document Control Number" },
      13: { name: "UB92 Locator 49 (National)" },
      14: { name: "UB92 Locator 56 (State)" },
      15: { name: "UB92 Locator 57 (National)" },
      16: { name: "UB92 Locator 78 (State)" },
      17: { name: "Special Visit Count" }
    }
  },

  "ZPI": {
    name: "Custom Patient Info (Z-Segment)",
    fields: {
      1: { name: "Set ID - ZPI" },
      2: { name: "Custom Field 1" },
      3: { name: "Custom Field 2" },
      4: { name: "Custom Field 3" },
      5: { name: "Custom Field 4" }
    }
  }
};

// List of known HL7 segment identifiers for detection
const HL7_SEGMENT_IDS = Object.keys(HL7_SEGMENTS);
