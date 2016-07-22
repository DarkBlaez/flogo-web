package counter

var jsonMetadata = `{
  "name": "tibco-counter",
  "version": "0.0.1",
  "description": "Simple Global Counter Activity",
  "inputs":[
    {
      "name": "counterName",
      "type": "string",
      "required": true
    },
    {
      "name": "increment",
      "type": "boolean"
    },
    {
      "name": "reset",
      "type": "boolean"
    }
  ],
  "outputs": [
    {
      "name": "value",
      "type": "integer"
    }
  ]
}`
