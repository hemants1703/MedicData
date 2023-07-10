import Head from 'next/head'
import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
// import "../styles/loginpage.css"

export default function Home() {

  const [user, setUser] = useState({ loggedIn: null })
  const [name, setName] = useState('')
  const [transactionStatus, setTransactionStatus] = useState(null)
  useEffect(() => fcl.currentUser.subscribe(setUser), [])

  const sendQuery = async () => {
    const profile = await fcl.query({
      cadence: `
        import Profile from 0xProfile

        pub fun main(address: Address): Profile.ReadOnly? {
          return Profile.read(address)
        }
      `,
      args: (arg, t) => [arg(user.addr, t.Address)]
    })

    setName(profile?.name ?? 'No Profile')
  }

  // NEW
  const initAccount = async () => {
    const transactionId = await fcl.mutate({
      cadence: `
        import Profile from 0xProfile

        transaction {
          prepare(account: AuthAccount) {
            // Only initialize the account if it hasn't already been initialized
            if (!Profile.check(account.address)) {
              // This creates and stores the profile in the user's account
              account.save(<- Profile.new(), to: Profile.privatePath)

              // This creates the public capability that lets applications read the profile's info
              account.link<&Profile.Base{Profile.Public}>(Profile.publicPath, target: Profile.privatePath)
            }
          }
        }
      `,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 50
    })

    const transaction = await fcl.tx(transactionId).onceSealed()
    console.log(transaction)
  }

  const executeTransaction = async () => {
    const transactionId = await fcl.mutate({
      cadence: `
        import Profile from 0xProfile
  
        transaction(name: String) {
          prepare(account: AuthAccount) {
            account
              .borrow<&Profile.Base{Profile.Owner}>(from: Profile.privatePath)!
              .setName(name)
          }
        }
      `,
      args: (arg, t) => [arg("DevLoopers", t.String)],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 50
    })

    fcl.tx(transactionId).subscribe(res => setTransactionStatus(res.status))
  }



  const
    AuthedState = () => {
      return (
        <div>
          <div className="patient-card">
            <div className="patient-img-box"><img className="patient-img" src="images/patient-1.jpeg"></img></div>
            <div className="patient-details">
              <h2>John Doe</h2>
              <div>Address: {user?.addr ?? "No Address"}</div>
              {/* <div>Profile Name: {name ?? "--"}</div> */}
              <div>Transaction Status: {transactionStatus ?? "--"}</div>
            </div>
          </div>
          {/* <button onClick={sendQuery}>Send Query</button> */}
          <button onClick={initAccount}>Put Account on Flow</button>
          <button onClick={executeTransaction}>Transact</button>
          <button className="logout-button" onClick={fcl.unauthenticate}><img className="logout-button-img" src="images/logout-img.png" width={"20px"} height={"20px"} title="Logout"></img></button>
        </div>
      )
    }

  const UnauthenticatedState = () => {
    return (
      <div>
        <button onClick={fcl.logIn}>Login</button>
        <button onClick={fcl.signUp}>Signup</button>
      </div>
    )
  }

  return (
    <main>
      <Head>
        <title>FCL Quickstart with NextJS</title>
        <meta name="description" content="My first web3 app on Flow!" />
        <link rel="icon" href="/favicon.png" />
      </Head>
      <div className="login-form">
        <h1>MedicData</h1>
        {user.loggedIn
          ? <AuthedState />
          : <UnauthenticatedState />
        }
      </div>
    </main>
  )
}
