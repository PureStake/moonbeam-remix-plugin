import React from 'react';
import { Alert, Accordion, Button, Card, Form, InputGroup } from 'react-bootstrap';
import copy from 'copy-to-clipboard';
import { CSSTransition } from 'react-transition-group';
import { AbiInput, AbiItem } from 'web3-utils';
// import { MoonbeamLib } from '@dexfair/moonbeamLib-web-signer';
import { MoonbeamLib } from '../moonbeam-signer';
import { InterfaceContract } from './Types';
import Method from './Method';
import './animation.css';

const EMPTYLIST = 'Currently you have no contract instances to interact with.';

interface InterfaceDrawMethodProps {
	moonbeamLib: MoonbeamLib;
	busy: boolean;
	setBusy: (state: boolean) => void;
	abi: AbiItem;
	address: string;
	updateBalance: (address: string) => void;
}

const DrawMethod: React.FunctionComponent<InterfaceDrawMethodProps> = (props) => {
	const [error, setError] = React.useState<string>('');
	const [success, setSuccess] = React.useState<string>('');
	const [value, setValue] = React.useState<string>('');
	const [args, setArgs] = React.useState<{ [key: string]: string }>({});
	const { moonbeamLib, busy, /* setBusy, */ abi, address, updateBalance } = props;

	React.useEffect(() => {
		const temp: { [key: string]: string } = {};
		abi.inputs?.forEach((element: AbiInput) => {
			temp[element.name] = '';
		});
		setArgs(temp);
	}, [abi.inputs]);

	function buttonVariant(stateMutability: string | undefined): string {
		switch (stateMutability) {
			case 'view':
			case 'pure':
				return 'primary';
			case 'nonpayable':
				return 'warning';
			case 'payable':
				return 'danger';
			default:
				break;
		}
		return '';
	}

	return (
		<>
			<Method
				abi={abi}
				setArgs={(name: string, value2: string) => {
					args[name] = value2;
				}}
			/>
			<Alert variant="danger" onClose={() => setError('')} dismissible hidden={error === ''}>
				<small>{error}</small>
			</Alert>
			<Alert variant="success" onClose={() => setSuccess('')} dismissible hidden={success === ''}>
				<small>{success}</small>
			</Alert>
			<InputGroup className="mb-3">
				<InputGroup.Prepend>
					<Button
						variant={buttonVariant(abi.stateMutability)}
						block
						size="sm"
						disabled={busy || !(moonbeamLib && moonbeamLib.isConnected && moonbeamLib.isMoonbeamNetwork)}
						onClick={async () => {
							// setBusy(true)
							const parms: string[] = [];
							abi.inputs?.forEach((item: AbiInput) => {
								parms.push(args[item.name]);
							});
							const newContract = new moonbeamLib.web3.eth.Contract(JSON.parse(JSON.stringify([abi])), address);
							const accounts = await moonbeamLib.getAccounts();
							if (abi.stateMutability === 'view' || abi.stateMutability === 'pure') {
								try {
									const txReceipt = abi.name
										? await newContract.methods[abi.name](...parms).call({ from: accounts[0] })
										: null;
									if (typeof txReceipt === 'object') {
										setSuccess(JSON.stringify(txReceipt, null, 4));
									} else {
										setValue(txReceipt);
									}
									// TODO: LOG
								} catch (e) {
									// console.error(error)
									setError(e.message ? e.message : e.toString());
								}
							} else {
								try {
									const txReceipt = abi.name
										? await newContract.methods[abi.name](...parms).send({ from: accounts[0] })
										: null;
									// console.log(txReceipt)
									setError('');
									setSuccess(JSON.stringify(txReceipt, null, 2));
									updateBalance(accounts[0]);
									// TODO: LOG
								} catch (e) {
									// console.error(error)
									setError(e.message ? e.message : e.toString());
								}
							}
							// setBusy(false)
						}}
					>
						<small>{abi.stateMutability === 'view' || abi.stateMutability === 'pure' ? 'call' : 'transact'}</small>
					</Button>
					<Button
						variant={buttonVariant(abi.stateMutability)}
						size="sm"
						className="mt-0 pt-0 float-right"
						onClick={() => {
							if (abi.name) {
								try {
									const parms: string[] = [];
									abi.inputs?.forEach((item: AbiInput) => {
										if (args[item.name]) {
											parms.push(args[item.name]);
										}
									});
									const newContract = new moonbeamLib.web3.eth.Contract(JSON.parse(JSON.stringify([abi])), address);
									copy(newContract.methods[abi.name](...parms).encodeABI());
								} catch (e) {
									console.log(e.toString());
								}
							}
						}}
					>
						<i className="far fa-copy" />
					</Button>
				</InputGroup.Prepend>
				<Form.Control
					value={value}
					size="sm"
					readOnly
					hidden={!(abi.stateMutability === 'view' || abi.stateMutability === 'pure')}
				/>
			</InputGroup>
		</>
	);
};

const ContractCard: React.FunctionComponent<{
	moonbeamLib: MoonbeamLib;
	busy: boolean;
	setBusy: (state: boolean) => void;
	// blockscout: string;
	contract: InterfaceContract;
	index: number;
	remove: () => void;
	updateBalance: (address: string) => void;
}> = (props) => {
	const [enable, setEnable] = React.useState<boolean>(true);
	const {
		moonbeamLib,
		busy,
		setBusy,
		// blockscout,
		contract,
		index,
		remove,
		updateBalance,
	} = props;

	function DrawMathods() {
		const list = contract.abi ? contract.abi : [];
		const items = list.map((abi: AbiItem, id: number) => (
			<Accordion key={`Methods_A_${index.toString()}`}>
				<Card>
					<Accordion.Toggle as={Card.Header} eventKey={`Methods_${id}`} className="p-1">
						<small>{abi.name}</small>
					</Accordion.Toggle>
					<Accordion.Collapse eventKey={`Methods_${id}`}>
						<Card.Body className="py-1 px-2">
							<DrawMethod
								moonbeamLib={moonbeamLib}
								busy={busy}
								setBusy={setBusy}
								abi={abi}
								address={contract.address}
								updateBalance={updateBalance}
							/>
						</Card.Body>
					</Accordion.Collapse>
				</Card>
			</Accordion>
		));
		return <>{items}</>;
	}

	return (
		<CSSTransition in={enable} timeout={300} classNames="zoom" unmountOnExit onExited={remove}>
			<Card className="mb-2">
				<Card.Header className="px-2 py-1">
					<strong className="align-middle">{contract.name}</strong>
					&nbsp;
					<small className="align-middle">{`${contract.address.substring(0, 6)}...${contract.address.substring(
						38
					)}`}</small>
					{/* <Button
						className="float-right align-middle"
						size="sm"
						variant="link"
						onClick={() => {
							window.open(`${blockscout}/address/${contract.address}`);
						}}
					>
						<i className="fas fa-external-link-alt" />
					</Button> */}
					<Button
						className="float-right align-middle"
						size="sm"
						variant="link"
						onClick={() => {
							setEnable(false);
						}}
					>
						<i className="fas fa-trash-alt" />
					</Button>
				</Card.Header>
				{DrawMathods()}
			</Card>
		</CSSTransition>
	);
};

interface InterfaceSmartContractsProps {
	moonbeamLib: MoonbeamLib;
	busy: boolean;
	setBusy: (state: boolean) => void;
	// blockscout: string;
	contracts: InterfaceContract[];
	updateBalance: (address: string) => void;
}

const SmartContracts: React.FunctionComponent<InterfaceSmartContractsProps> = (props) => {
	const [error, setError] = React.useState<string>('');
	const [count, setCount] = React.useState<number>(0);
	const {
		moonbeamLib,
		busy,
		setBusy,
		// blockscout,
		contracts,
		updateBalance,
	} = props;

	React.useEffect(() => {
		setCount(0);
		setError(EMPTYLIST);
	}, [contracts, busy]);

	function DrawContracts() {
		const items = contracts.map((data: InterfaceContract, index: number) => (
			<ContractCard
				moonbeamLib={moonbeamLib}
				busy={busy}
				setBusy={setBusy}
				// blockscout={blockscout}
				contract={data}
				index={index}
				remove={() => {
					setCount(count + 1);
					setError(EMPTYLIST);
				}}
				updateBalance={updateBalance}
				key={`Contract_${index.toString()}`}
			/>
		));
		return <>{items}</>;
	}

	return (
		<div className="SmartContracts">
			<Alert variant="warning" className="text-center" hidden={contracts.length !== count}>
				<small>{error}</small>
			</Alert>
			{DrawContracts()}
		</div>
	);
};

export default SmartContracts;
