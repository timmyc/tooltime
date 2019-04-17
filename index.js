#!/usr/bin/env node
'use strict';

const clipboardy = require( 'clipboardy' );
const program = require( 'commander' );
const urlencode = require( 'urlencode' );
const urldecode = require( 'urldecode' );
const request = require( 'request' );
const _ = require( 'lodash' );

const secretGitHubToken = 'put your awesome github token here';

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
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Authorization': `token ${secretGitHubToken}`,
			'Accept': 'application/vnd.github.inertia-preview+json',
			'User-Agent': 'request'
		}
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

const columnCards = ( columnId ) => {
	const options = {
		url: `https://api.github.com/projects/columns/${columnId}/cards`,
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Authorization': `token ${secretGitHubToken}`,
			'Accept': 'application/vnd.github.inertia-preview+json',
			'User-Agent': 'request'
		}
	}

	request( options, ( error, response, body ) => {
		if ( ! error && response.statusCode == 200 ) {
			const data = JSON.parse( body );
			const cards = _.map( data, ( card ) => { console.log( card.content_url.replace( 'https://api.github.com/repos/', 'https://github.com/' ) + '\r' ); } );
			//console.log( cards.join( '\r' ) );
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

program.parse( process.argv );

//if ( program.args.length === 0 ) program.help();
