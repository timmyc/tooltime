#!/usr/bin/env node
'use strict';

const clipboardy = require( 'clipboardy' );
const program = require( 'commander' );
const urlencode = require( 'urlencode' );
const urldecode = require( 'urldecode' );
const request = require( 'request' );
const _ = require( 'lodash' );

let collaborators = [];

const headers = {
  'Content-Type': 'application/json;charset=UTF-8',
  'Authorization': `token ${process.env.GH_API_TOKEN}`,
  'Accept': 'application/vnd.github.inertia-preview+json',
  'User-Agent': 'request'
};

const encodeString = ( string ) => {
	const input = string && string.length ? string : clipboardy.readSync();
	console.log( `enoding: ${ input }` );
	const enocded = urlencode( input );
	clipboardy.writeSync( enocded );
	console.log( `${ enocded } copied to clipboard 💫` );
}

const decodeString = ( string ) => {
	const input = string && string.length ? string : clipboardy.readSync();
	console.log( `decoding: ${ input }` );
	const enocded = urldecode( input );
	clipboardy.writeSync( enocded );
	console.log( `${ enocded } copied to clipboard 💫` );
}

const projectColumns = ( projectId ) => {
	const options = {
		url: 'https://api.github.com/projects/1492664/columns',
		headers,
	}

	request( options, ( error, response, body ) => {
		if ( ! error && response.statusCode == 200 ) {
			const data = JSON.parse( body );
			const columns = _.map( data, ( column ) => { return [ column.id, column.name ]; } );
			console.log( columns );
		} else {
			console.log( '🤯' );
			console.log( response.statusMessage );
		}
	} );
}

const getPullRequestType = labels => {
	const typeLabel = labels.find( label => label.name.includes( '[Type]' ) );
	if ( ! typeLabel ) {
		return 'Dev';
	}
	return typeLabel.name.replace( '[Type] ', '' );
};

const getLabels = labels => {
	return labels
		.filter( label => ! /\[.*\]/.test( label.name ) )
		.map( label => label.name )
		.join( ', ' );

};

const getCollaborator = ( username ) => {
  request( {
    url: `https://api.github.com/orgs/woocommerce/members/${ username }`,
    headers
  }, ( error, response ) => {
    if ( response.statusCode == 204 ) {
      console.log( 'is a member' );
    } else {
      console.log( '🤯' );
      console.log( response.statusMessage );
    }
  } );
}

const getPullRequest = ( content_url ) => {
  const options = {
    url: content_url,
    headers
  }

  request( options, ( error, response, body ) => {
    if ( ! error && response.statusCode == 200 ) {
      const data = JSON.parse( body );
      if ( data.pull_request ) {
      	const type = getPullRequestType( data.labels );
      	const labels = getLabels( data.labels );
      	const labelTag = labels.length ? `(${ labels })` : '';
        const collaborator = collaborators.find( user => user.login === data.user.login );
      	const authorTag = !! collaborator ? '' : `@${ data.user.login }`;
      	const entry = `- ${ type }: ${ data.title } ${ authorTag } #${ data.number } ${ labelTag }`;
        console.log( entry );
			}
    } else {
      console.log( '🤯' );
      console.log( content_url );
      console.log( response.statusMessage );
    }
  } );
};

const columnCards = ( columnId ) => {
  const options = {
    url: `https://api.github.com/projects/columns/${columnId}/cards`,
    headers
  }

  request( options, ( error, response, body ) => {
    if ( ! error && response.statusCode == 200 ) {
      const data = JSON.parse( body );
      data.forEach( card => getPullRequest( card.content_url ) )
    } else {
      console.log( '🤯' );
      console.log( response.statusMessage );
    }
  } );
}

program
	.version( '0.0.1' )
	.command( 'enc [string]' )
	.description( 'url encode a string' )
	.action( encodeString );

program
	.command( 'dec [string]' )
	.description( 'url decode a string' )
	.action( decodeString );

program
	.command( 'columns' )
	.description( 'get columns' )
	.action( projectColumns );

program
	.command( 'cards' )
	.description( 'get cards' )
	.action( columnCards );

// program
// 	.command( 'changelog' )
// 	.description( 'create changelog' )
// 	.action( columnCards )

program.parse( process.argv );

//if ( program.args.length === 0 ) program.help();
