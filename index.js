const express = require('express')
const app = express()
const db = require('@cyclic.sh/dynamodb')
const cors = require('cors')
const axios = require('axios').default

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

// #############################################################################
// This configures static hosting for files in /public that have the extensions
// listed in the array.
// var options = {
//   dotfiles: 'ignore',
//   etag: false,
//   extensions: ['htm', 'html','css','js','ico','jpg','jpeg','png','svg'],
//   index: ['index.html'],
//   maxAge: '1m',
//   redirect: false
// }
// app.use(express.static('public', options))
// #############################################################################

// Create or Update an item
app.post('/:col/:key', async (req, res) => {
  console.log(req.body)

  const col = req.params.col
  const key = req.params.key
  const item = await db.collection(col).set(key, req.body)
  var jsonString = JSON.stringify(item)
  var json = JSON.parse(jsonString)
  var accepted = (json.props.accepted) ? "Ja" : "Nein"

  axios.post('https://api.sendgrid.com/v3/mail/send', 
    {"personalizations": [
      {"to": [{"email": "arturundjulia@gmail.com"}]}],
       "from": {"email": "mail@schwarz.wedding"},
       "subject": 'Neue Rückmeldung von ' + json.props.name + '!',
       "content": [{"type": "text/plain", "value": 'Eine neue Rückmeldung wurde gespeichert! \r\n\r\n' 
            + 'Zugesagt? ' + accepted + '\r\n' 
            + 'Weitere Personen: ' + json.props.more}]
     }, 
    {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ` + process.env.SENDGRID_API_KEY 
    }
  })
  /*.then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });*/
  
  res.json(item).end()
})

// Delete an item
app.delete('/:col/:key', async (req, res) => {
  const col = req.params.col
  const key = req.params.key
  console.log(`from collection: ${col} delete key: ${key} with params ${JSON.stringify(req.params)}`)
  const item = await db.collection(col).delete(key)
  console.log(JSON.stringify(item, null, 2))
  res.json(item).end()
})

// Delete all items
app.delete("/:col", async (req, res) => {
  const col = req.params.col
  const key = req.params.key
  const { results: collection } = await db.collection(col).list();

  await Promise.all(
    collection.map(async ({ key }) => await db.collection(col).delete(key))
  )

  res.json({ msg: 'Done!' }).end()
})

// Get a single item
app.get('/:col/:key', async (req, res) => {
  const col = req.params.col
  const key = req.params.key
  console.log(`from collection: ${col} get key: ${key} with params ${JSON.stringify(req.params)}`)
  const item = await db.collection(col).get(key)
  console.log(JSON.stringify(item, null, 2))
  res.json(item).end()
})

// Get a full listing
app.get('/:col', async (req, res) => {
  const col = req.params.col
  const { results: collection } = await db.collection(col).list();

  const items = await Promise.all(
    collection.map(async ({ key }) => (await db.collection(col).get(key)))
  );

  if (items[0] != null) {
    var response = ''
    var acceptedItems = items.filter((item) => item.props.accepted === true)    
    var declinedItems = items.filter((item) => item.props.accepted === false)
    var response = '<h3 style="font-family: system-ui;">Zusagen</h3><br/><ul>'
    acceptedItems.forEach(
        (item) => {
          response += '<li><p style="font-family: system-ui;">' + item.props.name + ' (Weitere Personen: ' + item.props.more + ')</p></li>'
        }
    )
    response += '</ul><br/><h3 style="font-family: system-ui;">Absagen</h3><br/><ul>'
    declinedItems.forEach(
        (item) => {
          response += '<li><p style="font-family: system-ui;">' + item.props.name + ' (Weitere Personen: ' + item.props.more + ')</p></li>'
        }
    )
    response += '</ul>'
    res.send(response).end()
  } else {
    res.send('<h3 style="font-family: system-ui;">Zusagen</h3><br/><br/><h3 style="font-family: system-ui;">Absagen</h3><br/>').end()
  }
})

// Catch all handler for all other request.
app.use('*', (req, res) => {
  res.json({ msg: 'no route handler found' }).end()
})

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`index.js listening on ${port}`)
})
