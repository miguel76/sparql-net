import { Algebra } from 'sparqlalgebrajs';
import {Term} from "rdf-js";

export interface Component {
    isObserved(): boolean;
}

export interface GraphConsumer extends Component {}
export interface DatasetConsumer extends Component {}
export interface RDFTermConsumer extends Component {}
export interface RDFTermObserver {}
export interface TabularConsumer extends Component {}
export interface TabularObserver {}

export class GraphSource implements Component {
    // [key:string]: any;
    type: string;
    consumers: GraphConsumer[] = [];

    constructor(type: string) {
        this.type = type;
    }

    addConsumer(consumer: GraphConsumer) {
        this.consumers.includes(consumer) || this.consumers.push(consumer);
    }

    removeConsumer(consumer: GraphConsumer) {
        const index = this.consumers.indexOf(consumer);
        (index > -1) && this.consumers.splice(index, 1);
    }

    isObserved() {
        return this.consumers.some(c => c.isObserved());
    }
}

// export interface Graph extends GraphSource {
//     type: 'graph';
//     graph: RDFGraph;
// }

export class GraphSelector extends GraphSource implements DatasetConsumer {
    type: 'graphSelector';
    datasetSource: DatasetSource;
    graphName: Term;

    constructor(datasetSource: DatasetSource, graphName: Term) {
        super('graphSelector');
        this.datasetSource = datasetSource;
        this.graphName = graphName;
        this.datasetSource.addConsumer(this);
    }

    detache() {
        this.datasetSource.removeConsumer(this);
    }
}

export class ConstructQuery extends GraphSource implements DatasetConsumer {
    type: 'constructQuery';
    datasetSource: DatasetSource;
    construct: Algebra.Construct;

    constructor(datasetSource: DatasetSource, construct: Algebra.Construct) {
        super('constructQuery');
        this.datasetSource = datasetSource;
        this.construct = construct;
        this.datasetSource.addConsumer(this);
    }

    detache() {
        this.datasetSource.removeConsumer(this);
    }
}

export class DatasetSource implements Component {
    // [key:string]: any;
    type: string;
    consumers: DatasetConsumer[] = [];

    constructor(type: string) {
        this.type = type;
    }

    addConsumer(consumer: DatasetConsumer) {
        this.consumers.includes(consumer) || this.consumers.push(consumer);
    }

    removeConsumer(consumer: DatasetConsumer) {
        const index = this.consumers.indexOf(consumer);
        (index > -1) && this.consumers.splice(index, 1);
    }

    isObserved() {
        return this.consumers.some(c => c.isObserved());
    }
}

export class DatasetBuilder extends DatasetSource implements GraphConsumer {
    type: 'datasetBuilder';
    defaultGraphSource: GraphSource;
    namedGraphSources: Map<RDFTerm, GraphSource>;

    constructor(defaultGraphSource: GraphSource, namedGraphSources: Map<RDFTerm, GraphSource>) {
        super('datasetBuilder');
        this.defaultGraphSource = defaultGraphSource;
        this.namedGraphSources = namedGraphSources;
        this.defaultGraphSource.addConsumer(this);
        Object.values(this.namedGraphSources).forEach(namedGraphSource => {
            namedGraphSource.addConsumer(this);
        });
    }

    detache() {
        this.defaultGraphSource.removeConsumer(this);
        Object.values(this.namedGraphSources).forEach(namedGraphSource => {
            namedGraphSource.removeConsumer(this);
        });
    }
}

export class DatasetMerge extends DatasetSource implements DatasetConsumer {
    type: 'datasetMerge';
    inputDatasetSources: DatasetSource[];

    constructor(inputDatasetSources: DatasetSource[]) {
        super('datasetMerge');
        this.inputDatasetSources = inputDatasetSources;
        this.inputDatasetSources.forEach(inputSource => {
            inputSource.addConsumer(this);
        });
    }

    detache() {
        this.inputDatasetSources.forEach(inputSource => {
            inputSource.removeConsumer(this);
        });
    }
}

export class SparqlEndpoint extends DatasetSource {
    type: 'sparqlEndpoint';
    baseURL: string;

    constructor(baseURL: string) {
        super('sparqlEndpoint');
        this.baseURL = baseURL;
    }
}

export class DefaultSparqlEndpoint extends DatasetSource {
    type: 'defaultSparqlEndpoint';

    constructor() {
        super('defaultSparqlEndpoint');
    }
}

export class RDFTermSource implements Component {
    // [key:string]: any;
    type: string;
    consumers: RDFTermConsumer[] = [];
    observers: RDFTermObserver[] = [];

    constructor(type: string) {
        this.type = type;
    }

    addConsumer(consumer: RDFTermConsumer) {
        this.consumers.includes(consumer) || this.consumers.push(consumer);
    }

    removeConsumer(consumer: RDFTermConsumer) {
        const index = this.consumers.indexOf(consumer);
        (index > -1) && this.consumers.splice(index, 1);
    }

    addObserver(consumer: RDFTermConsumer) {
        this.observers.includes(this) || this.observers.push(this);
    }

    removeObserver(consumer: RDFTermConsumer) {
        const index = this.observers.indexOf(consumer);
        (index > -1) && this.observers.splice(index, 1);
    }

    hasObserver(): boolean {
        return this.observers.length > 0;
    }

    isObserved() {
        return this.hasObserver() || this.consumers.some(c => c.isObserved());
    }

}

export class RDFTerm extends RDFTermSource {
    type: 'rdfTerm';
    rdfTerm: Term;

    constructor(rdfTerm: Term) {
        super('rdfTerm');
        this.rdfTerm = rdfTerm;
    }
}

export class VarFromSelectQuery extends RDFTermSource implements DatasetConsumer, RDFTermConsumer {
    type: 'varFromSelect';
    varName: string;
    selectQuery: Algebra.Operation;
    datasetSource: DatasetSource;
    params: Map<string, RDFTermSource>;

    constructor(varName: string, selectQuery: Algebra.Operation, datasetSource: DatasetSource, params: Map<string, RDFTermSource>) {
        super('varFromSelect');
        this.varName = varName;
        this.selectQuery = selectQuery;
        this.datasetSource = datasetSource;
        this.params = params;
        this.datasetSource.addConsumer(this);
        // this.params.values().forEach(x => x.addConsumer(this));
        for (let source of this.params.values()) {
            source.addConsumer(this);
        }
    }

    detache() {
        this.datasetSource.removeConsumer(this);
    }
}

export class AllTermsFromDatasetSource extends RDFTermSource implements DatasetConsumer {
    type: 'allTerms';
    datasetSource: DatasetSource;

    constructor(datasetSource: DatasetSource) {
        super('allTerms');
        this.datasetSource = datasetSource;
        this.datasetSource.addConsumer(this);
    }

    detache() {
        this.datasetSource.removeConsumer(this);
    }
}

export class TabularSource implements Component {
    // [key:string]: any;
    type: string;
    consumers: TabularConsumer[] = [];
    observers: TabularObserver[] = [];

    constructor(type: string) {
        this.type = type;
    }

    addConsumer(consumer: TabularConsumer) {
        this.consumers.includes(consumer) || this.consumers.push(consumer);
    }

    removeConsumer(consumer: TabularConsumer) {
        const index = this.consumers.indexOf(consumer);
        (index > -1) && this.consumers.splice(index, 1);
    }

    addObserver(consumer: TabularObserver) {
        this.observers.includes(this) || this.observers.push(this);
    }

    removeObserver(consumer: TabularObserver) {
        const index = this.observers.indexOf(consumer);
        (index > -1) && this.observers.splice(index, 1);
    }

    hasObserver(): boolean {
        return this.observers.length > 0;
    }

    isObserved() {
        return this.hasObserver() || this.consumers.some(c => c.isObserved());
    }

    getDatasetSource(): DatasetSource {
        return undefined;
    }

}

// Record<Keys,Type>

export type NamedVarMapping = {name: string, nameInQuery: string};

export type VarMapping = {
    default?: string;
    named: NamedVarMapping[];
};

export type TabularSourceAndMapping = {
    source: TabularSource;
    var: VarMapping;
};

export class SelectQuerySource extends TabularSource implements DatasetConsumer, TabularConsumer {
    type: 'selectQuery';
    output: VarMapping;
    selectQuery: Algebra.Operation;
    datasetSource: DatasetSource;
    bindingSources: TabularSourceAndMapping[];

    constructor(
            output: VarMapping,
            selectQuery: Algebra.Operation,
            datasetSource: DatasetSource,
            bindingSources: TabularSourceAndMapping[]) {
        super('selectQuery');
        this.output = output;
        this.selectQuery = selectQuery;
        this.datasetSource = datasetSource;
        this.bindingSources = bindingSources;
        this.datasetSource.addConsumer(this);
        this.bindingSources.forEach(s => s.source.addConsumer(this));
    }

    detache() {
        this.datasetSource.removeConsumer(this);
    }

    getDatasetSource(): DatasetSource {
        return this.datasetSource;
    }
}

export class DefaultVarAllTerms extends TabularSource implements DatasetConsumer {
    type: 'defaultVarAllTerms';
    datasetSource: DatasetSource;

    constructor(datasetSource: DatasetSource) {
        super('defaultVarAllTerms');
        this.datasetSource = datasetSource;
        this.datasetSource.addConsumer(this);
    }

    detache() {
        this.datasetSource.removeConsumer(this);
    }


    getDatasetSource(): DatasetSource {
        return this.datasetSource;
    }
}

export interface NodeSource {
    graphSource: GraphSource;
    rdfTermSource: RDFTermSource;
}

export interface Context {
    nodeSource: NodeSource;
    rdfTermSource: RDFTermSource;
}
