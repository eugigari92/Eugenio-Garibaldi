import { useState, useEffect } from 'react'
import personsService from './services/persons'

const Filter = ({ searchTerm, handleSearchChange }) => {
  return (
    <div>
      filter shown with: <input 
        value={searchTerm}
        onChange={handleSearchChange}
      />
    </div>
  )
}

const PersonForm = ({ newName, newNumber, handleNameChange, handleNumberChange, addPerson }) => {
  return (
    <form onSubmit={addPerson}>
      <div>
        name: <input 
          value={newName}
          onChange={handleNameChange}
        />
      </div>
      <div>
        number: <input 
          value={newNumber}
          onChange={handleNumberChange}
        />
      </div>
      <div>
        <button type="submit">add</button>
      </div>
    </form>
  )
}

const Persons = ({ persons, handleDelete }) => {
  return (
    <>
      {persons.map(person => 
        <div key={person.id}>
          {person.name} {person.number} <button onClick={() => handleDelete(person.id, person.name)}>delete</button>
        </div>
      )}
    </>
  )
}

const App = () => {
  const [persons, setPersons] = useState([]) 
  const [newName, setNewName] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    console.log('Fetching data from server...')
    personsService
      .getAll()
      .then(data => {
        console.log('Data received:', data)
        setPersons(data)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
      })
  }, [])

  const addPerson = (event) => {
    event.preventDefault()
    
    // Check if name already exists
    const existingPerson = persons.find(person => person.name === newName)
    
    if (existingPerson) {
      if (window.confirm(`${newName} is already added to phonebook, replace the old number with a new one?`)) {
        const personObject = {
          name: newName,
          number: newNumber
        }
        
        personsService
          .update(existingPerson.id, personObject)
          .then(returnedPerson => {
            setPersons(persons.map(person => 
              person.id !== existingPerson.id ? person : returnedPerson
            ))
            setNewName('')
            setNewNumber('')
          })
          .catch(error => {
            console.error('Error updating person:', error)
          })
      }
    } else {
      const personObject = {
        name: newName,
        number: newNumber
      }
      
      personsService
        .create(personObject)
        .then(returnedPerson => {
          setPersons(persons.concat(returnedPerson))
          setNewName('')
          setNewNumber('')
        })
        .catch(error => {
          console.error('Error creating person:', error)
        })
    }
  }

  const handleNameChange = (event) => {
    setNewName(event.target.value)
  }

  const handleNumberChange = (event) => {
    setNewNumber(event.target.value)
  }

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
  }

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      personsService
        .remove(id)
        .then(() => {
          setPersons(persons.filter(person => person.id !== id))
        })
        .catch(error => {
          console.error('Error deleting person:', error)
        })
    }
  }

  const filteredPersons = persons.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  console.log('Current persons state:', persons)
  console.log('Filtered persons:', filteredPersons)

  return (
    <div>
      <h2>Phonebook</h2>

      <Filter 
        searchTerm={searchTerm}
        handleSearchChange={handleSearchChange}
      />

      <h3>Add a new</h3>

      <PersonForm 
        newName={newName}
        newNumber={newNumber}
        handleNameChange={handleNameChange}
        handleNumberChange={handleNumberChange}
        addPerson={addPerson}
      />

      <h3>Numbers</h3>

      <Persons persons={filteredPersons} handleDelete={handleDelete} />
    </div>
  )
}

export default App