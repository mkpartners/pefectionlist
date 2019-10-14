/* eslint-disable no-console */
import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import initPFList from '@salesforce/apex/PerfectionListController.initPFList';
import saveRecord from '@salesforce/apex/PerfectionListController.saveRecord';

export default class PerfectionList extends NavigationMixin(LightningElement) {

  // Attributes passed in to the Component by the Page
  @api recordId;  //RecordId if renderd on a Record's Page
  @api cardTitle;
  @api sObjectName;
  @api fieldsString;
  @api editableFieldsString;
  @api selectedListViewId;
  @api childRelationship;
  @api whereClause; // string
  @api orderByField;
  @api rowLimit;
  @api rowsDivStyle;

  // Attributes that are tracked because they may be modified
  @track columns; // array of column objects
  @track dataTableColumns;
  @track filterText = ''; // global search
  @track records; // array of original records returned from the DB
  @track selectedListView;
  @track showFilters; // boolean
 
  @track recordCount = {
    showing: 0,
    total: ''
  };

  @track sortState = {
    column: '',
    direction: ''
  };

  @track _iconName;
  @track error;

  get isFalse(){
    return false;
  }

  // Private variables
  version = 'PerfectionList 0.1.5.2 made with <3 by MK Partners, Inc.'; // --> © ® ™ work
  _filteredRecords; // array of only the records being displayed
  _listViewsOptions;
  _queryDateTime;

  get cardTitleLabel() {
    let label = 'List';
    if ( this.cardTitle !== undefined && this.cardTitle !== null && this.cardTitle.length > 0 ){
      label = this.cardTitle;
    }
    return label;
  }

  get displayedRecords(){
    return this._filteredRecords;
  }

  get queryDateTime(){
    return this._queryDateTime;
  }

  get rowsDivClassName(){
    let name = 'row slds-m-horizontal_small';
    if ( undefined !== this.rowsDivClass && null !== this.rowsDivClass && this.rowsDivClass.length > 0 ){
      name = this.rowsDivClass;
    }
    return name;
  }

  get lvOptions() {
    return this._listViewsOptions;
  }

  get searchPlaceHolder() {
    return 'Search this list...';
  }

  get iconName() {
    return this._iconName;
  }

  get searchBoxWidth() {
    return 'slds-m-bottom_xx-small slds-align_absolute-center slds-text-align_center slds-size_1-of-' + Math.floor(this.columns.length / 2);
  }

  get columnGridLength() {
    let colLength = this.columns.length;
    if ( colLength > 8 ){
      colLength = 12;
    }
    return 'slds-m-right_xx-small slds-truncate slds-col cell slds-size_1-of-' + colLength;
  }

  get showListViewOptions(){
    let predefined = this.isNotBlank(this.whereClause) || this.isNotBlank(this.childRelationship) || this.isNotBlank(this.selectedListViewId);
    return predefined === false;
  }

  connectedCallback() {
    this.showFilters = false;
    if ( this.isNotBlank(this.selectedListViewId) ){
      this.selectedListView = this.selectedListViewId;
    }
    this.populateTable();
  }

  populateTable(){
    initPFList({ 
      sObjectName: this.sObjectName, 
      fieldsString: this.fieldsString, 
      selectedListViewId: this.selectedListView,
      parentId: this.recordId,
      childRelationship: this.childRelationship,  
      whereClause: this.whereClause,
      orderByField: this.orderByField,
      rowLimit: this.rowLimit
    })
      .then(res => {
        this.log('RES');
        this.log(res);
        this._queryDateTime = new Date();
        if ( null != this.sObjectName && undefined !== this.sObjectName ){
          this._iconName = this.sObjectName.includes('__') ? 'standard:lightning_component' : 'standard:' + this.sObjectName.toLowerCase();
        }
        let ret_listViewsOptions = res.listViewsOptions;

        let expanded_columns = [];
        let _dataTableColumns = [];
        for(let col = 0; col < res.columns.length; col++) {
          let newCol = res.columns[col];
          let dataTableCol = {
            sortable: true,
            label: newCol.label, 
            fieldName: newCol.name, 
            type: newCol.type, 
            editable: this.editableFieldsString.includes(newCol.name) 
          };
          _dataTableColumns.push(dataTableCol);
          newCol.className = this.columnGridLength;
          if ( newCol.displayType === 'PICKLIST' ){
            newCol.className += ' overflowVisible';
          }
          newCol.iconName = 'utility:sort';
          newCol.iconState = false;
          newCol.isEditable = this.editableFieldsString.includes(newCol.name);
          expanded_columns.push(newCol);
        }
        this.dataTableColumns = _dataTableColumns;
        let expanded_records = [];
        for (let rec = 0; rec < res.records.length; rec++) {
          let newRecord = res.records[rec];
          newRecord.link = `/lightning/r/${this.sObjectName}/${res.records[rec].Id}/view`;
          expanded_records.push(newRecord);
        }

        let tempListViewsOptions = [];
        for(let lvo in ret_listViewsOptions ) {
          if ( ret_listViewsOptions.hasOwnProperty(lvo) ){
            let opt = { label: ret_listViewsOptions[lvo].Name, value: ret_listViewsOptions[lvo].Id };
            tempListViewsOptions.push( opt );
          }
        }
        this._listViewsOptions = tempListViewsOptions;
        this.records = expanded_records;
        this._filteredRecords = expanded_records;
        this.columns = expanded_columns;
        this.recordCount.showing = res.records.length;
        this.recordCount.total = res.records.length;        
      })
      .catch(err => {
        this.log( err );
        this.error = err;
      });
  }

  alphabetize(event) {
    let columnToSortBy = event.currentTarget.dataset.value;
    let colIndex = event.currentTarget.dataset.index;
    let direction = this.sortState.direction;
    let column = this.sortState.column;

    let directionToSortBy = column === columnToSortBy && direction === 'asc' ? 'desc' : 'asc';
    this.sortState.direction = directionToSortBy;
    this.sortState.column = columnToSortBy;

    this.filteredRecords = this.sort(this.records, columnToSortBy, directionToSortBy);
    let utilityIcon = directionToSortBy === 'asc' ? 'utility:arrowup' : 'utility:arrowdown';
    
    for(let col = 0; col < this.columns.length; col++) {
      this.columns[col].iconName = 'utility:sort';
      this.columns[col].iconState = false;
    }
    this.columns[colIndex].iconName = utilityIcon;
    this.columns[colIndex].iconState = true;
    this.filterRecords();
  }

  toggleFilterList(){
    this.showFilters = !this.showFilters;
  }
  @track sortedBy;
  @track sortDirection;

  updateColumnSorting(event) {
    let fieldName = event.detail.fieldName;
    let sortDirection = event.detail.sortDirection;
    this.log(fieldName + ' '+ sortDirection);
    this.sortedBy = fieldName;
    this.sortDirection = sortDirection;
    this.sortData();
  }

  sortData() {
    this.sortState.direction = this.sortDirection;
    this.sortState.column = this.sortedBy;
    this._filteredRecords = this.sort(this.records, this.sortedBy, this.sortDirection);
    this.filterRecords();
  }

  sort(records, column, direction) {
    let sortedRecords = records.sort((a, b) => {
      let s;
      if ( !this.isNotBlank(a[column])) {
        s = 1;
      }
      else if ( !this.isNotBlank(b[column])) {
        s = -1;
      }
      else if (a[column] === b[column]) {
        s = 0;
      }
      else if (direction === 'asc') {
        s = a[column] < b[column] ? -1 : 1;
      }
      else if (direction === 'desc') {
        s = a[column] < b[column] ? 1 : -1;
      }
      return s;
    });
    return sortedRecords;
  }

  // handleSObjectName(event) {
  //   this.sObjectName = event.detail.value.trim();
  // }

  handleListView(event) {
    this.selectedListView = event.detail.value;
    this.populateTable();
  }

  navigateToNewRecordPage() {
    this[NavigationMixin.Navigate]({
      type: 'standard__objectPage',
      attributes: {
        objectApiName: this.sObjectName,
        actionName: 'new'
      }
    });
  }

  searchRecords(event){
    if ( null !== event && undefined !== event ){
      this.filterText = event.target.value;
    }
    this.filterRecords();
  }

  handleColumnFilterUpdate(event){
    let columnId = event.target.id;
    columnId = columnId.substring(0,columnId.indexOf('-'));
    // this.log( columnId );
    let columnList = this.columns;
    for ( let c=0; c<columnList.length; c++ ){
      columnList[c].class = '';
      // this.log(columnList[c].name);
      if ( columnList[c].name === columnId ){
        columnList[c].filterText = event.detail.value;
        columnList[c].class = 'blue';
      }
    }
    this.columns = columnList;
    this.filterRecords();
  }

  handleFieldChange(event){
    this.log( event.target );
  }

  handleSave(event){
    let saveDraftValues = event.detail.draftValues;
    let record = saveDraftValues[0];
    let rowId = record.id;
    rowId = rowId.substring(4);
    let row = this._filteredRecords[rowId];
    record.Id = row.Id;
    delete record.id;
    this.log(record);

    saveRecord({
      record: JSON.stringify(record) 
    })
      .then(res => {
        this.log(res);
      })
      .catch(err => {
        this.log( err );
        this.error = err;
      });
  }

  filterRecords(){
    let recordsList = this.records;
    let columnList = this.columns;
    let globalSearchString = this.filterText;
    let filteredList = [];
    for ( let r=0; r<recordsList.length; r++ ){
      let record = recordsList[r];
      let recordMatchesSearch = false;
      let recordMatchesColumnFilter= true;
      for ( let c=0; c<columnList.length; c++ ){
        let column = columnList[c];

        //Check the Search Value
        let matchesSearch = true;
        if ( this.isNotBlank(globalSearchString ) ){
          matchesSearch = this.passesFilter( record, column, globalSearchString );
        }
        if ( matchesSearch === true ){
          recordMatchesSearch = true;
        }

        //Check the Column Filter Value
        let matchesColumnFilter = true;
        if ( this.isNotBlank(column.filterText) ){
          matchesColumnFilter = this.passesFilter( record, column, null);
        }
        if ( matchesColumnFilter === false ){
          recordMatchesColumnFilter = false;
        }
      }
      if ( recordMatchesSearch && recordMatchesColumnFilter ){
        // this.log( {"recordMatchesSearch": recordMatchesSearch, "recordMatchesColumnFilter": recordMatchesColumnFilter} );
        filteredList.push(record);
      }
    }
    this.recordCount.showing = filteredList.length;
    this._filteredRecords = filteredList;
  }

  isNotBlank(textValue){
    return (undefined !== textValue && null != textValue && textValue.length > 0);
  }

  passesFilter(record, column, searchString){
    let fieldValue = record[column.name];
    let matchesFilter = false;
    if ( null === searchString ){
      searchString = column.filterText;
    }
    if ( 
      column.displayType === 'STRING' || 
      column.displayType === 'TEXTAREA' || 
      column.displayType === 'EMAIL' || 
      column.displayType === 'PHONE' || 
      column.displayType === 'PICKLIST' || 
      column.displayType === 'MULTIPICKLIST' || 
      column.displayType === 'ADDRESS' || 
      column.displayType === 'COMBOBOX' || 
      column.displayType === 'ID' || 
      column.displayType === 'URL' 
    ){
      matchesFilter = this.containsString(searchString, fieldValue);
    } 
    else if ( column.displayType === 'REFERENCE' ){
      fieldValue = record;
      let parts = column.relatedRecordFieldName.split('.');
      for ( let p=0; p<parts.length; p++ ){
        if ( fieldValue.hasOwnProperty(parts[p]) ){
          fieldValue = fieldValue[parts[p]];
        }
      }
      if ( typeof fieldValue !== 'object' && typeof fieldValue !== 'undefined' ){
        matchesFilter = this.containsString(searchString, fieldValue);
      }
    }
    else if ( column.displayType === 'DATE' ){
      matchesFilter = this.containsString(searchString, fieldValue);
      //column.fromDate
      //column.toDate      
    }
    else if ( column.displayType === 'DATETIME' ){
      matchesFilter = this.containsString(searchString, fieldValue);
      //column.fromDate
      //column.toDate      
    }
    else if ( column.displayType === 'DOUBLE' || column.displayType === 'PERCENT' || column.displayType === 'CURRENCY' || column.displayType === 'INTEGER' || column.displayType === 'LONG' ){
      matchesFilter = this.containsString(searchString, fieldValue);
    }
    else if ( column.displayType === 'BOOLEAN' ){
      matchesFilter = this.containsString(searchString, fieldValue);
    }
    else {
      matchesFilter = true;
    }
    // this.log( column.displayType+' '+column.name+' '+matchesFilter );
    return matchesFilter;
  }

  dateIsWithin(thisDate, fromDate, throughDate){
    let isGreaterThanFromDate = false;
    let isLessThanThroughDate = false;
    if ( null === fromDate || thisDate >= fromDate ){
      isGreaterThanFromDate = true;
    }
    if ( null == throughDate || thisDate <= throughDate ){
      isLessThanThroughDate = true;
    }
    return isGreaterThanFromDate && isLessThanThroughDate;
  }

  containsString(searchingFor, searchingIn){
    let doesContainString;
    if ( null == searchingFor || undefined === searchingFor || searchingFor.trim().length === 0 ){
      doesContainString = true;
    }
    else if ( !this.isNotBlank(searchingIn) ){
      doesContainString = false;
    }
    else {
      searchingFor = searchingFor.trim().toLowerCase();
      searchingIn = searchingIn.trim().toLowerCase();
      doesContainString = searchingIn.includes( searchingFor );
    }
    return doesContainString;
  }

  refresh(event) {
    this.populateTable();
    // Retain filter state
  }

  log(...args) {
    for (let i = 0; i < args.length; i++) {
      let arg = args[i];
      let item = typeof arg === 'object' && arg !== undefined ? this.peel(arg) : arg;
      console.log(item);
    }
  }
  
  peel(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

}
