#!/usr/bin/env node
'use strict';

const clipboardy = require( 'clipboardy' );
const program = require( 'commander' );
const urlencode = require( 'urlencode' );
const urldecode = require( 'urldecode' );
const request = require( 'request' );
const requestPromise = require('request-promise');
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
const isCollaborator = async ( username ) => {
  return requestPromise( {
    url: `https://api.github.com/orgs/woocommerce/members/${ username }`,
    headers,
    resolveWithFullResponse: true
  } ).then( response => {
  	return response.statusCode === 204;
	} )
    .catch( err => {
    	if ( err.statusCode !== 404 ) {
        console.log( '🤯' );
        console.log( err.message );
			}
    });
}

const writeEntry = async ( content_url ) => {
  const options = {
    url: content_url,
    headers,
    json: true
  }
  return requestPromise( options )
		.then( async data => {
      if ( data.pull_request ) {
      	const collaborator = await isCollaborator( data.user.login );
        const type = getPullRequestType( data.labels );
        const labels = getLabels( data.labels );
        const labelTag = labels.length ? `(${ labels })` : '';
        const authorTag = !! collaborator ? '' : `👏 @${ data.user.login }`;
        const entry = `- ${ type }: ${ data.title } #${ data.number } ${ labelTag } ${ authorTag }`;
      	console.log( entry );
			}
		} )
    .catch( err => {
      console.log( '🤯' );
      console.log( err.message );
    });
};

const columnCards = async ( columnId ) => {
  const options = {
    url: `https://api.github.com/projects/columns/${columnId}/cards`,
    headers,
    json: true
  }

  return requestPromise( options )
    .catch( err => {
      console.log( '🤯' );
      console.log( err.message );
    });
}

const makeChangelog = async columnId => {
	const cards = await columnCards( columnId );
  cards.forEach( async card => {
  	await writeEntry( card.content_url );
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
	.command( 'changelog' )
	.description( 'create changelog' )
	.action( makeChangelog );

program.parse( process.argv );

//if ( program.args.length === 0 ) program.help();
