package ppsremote

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strings"
	"sync"

	"github.com/TIBCOSoftware/flogo-lib/core/flow"
	"github.com/TIBCOSoftware/flogo-lib/util"
	"github.com/TIBCOSoftware/flogo-lib/script/fggos"
	"github.com/op/go-logging"
)

var log = logging.MustGetLogger("flowprovider")

const (
	uriSchemeFile     = "file://"
	uriSchemeEmbedded = "embedded://"
)

// RemoteFlowProvider is an implementation of FlowProvider service
// that can access flowes via URI
type RemoteFlowProvider struct {
	//todo: switch to LRU cache
	mutex       *sync.Mutex
	flowCache   map[string]*flow.Definition
	embeddedMgr *util.EmbeddedFlowManager
}

// NewRemoteFlowProvider creates a RemoteFlowProvider
func NewRemoteFlowProvider() *RemoteFlowProvider {

	var service RemoteFlowProvider
	service.flowCache = make(map[string]*flow.Definition)
	service.mutex = &sync.Mutex{}
	return &service
}

// Start implements util.Managed.Start()
func (pps *RemoteFlowProvider) Start() error {
	// no-op
	return nil
}

// Stop implements util.Managed.Stop()
func (pps *RemoteFlowProvider) Stop() {
	// no-op
}

// Init implements services.FlowProviderService.Init()
func (pps *RemoteFlowProvider) Init(settings map[string]string, embeddedFlowMgr *util.EmbeddedFlowManager) {
	pps.embeddedMgr = embeddedFlowMgr
}

// GetFlow implements flow.Provider.GetFlow
func (pps *RemoteFlowProvider) GetFlow(flowURI string) *flow.Definition {

	//handle panic

	// todo turn pps.flowCache to real cache
	if flow, ok := pps.flowCache[flowURI]; ok {
		log.Debugf("Accessing cached Flow: %s\n")
		return flow
	}

	log.Debugf("Get Flow: %s\n", flowURI)

	var flowJSON []byte

	if strings.HasPrefix(flowURI, uriSchemeEmbedded) {

		log.Debugf("Loading Embedded Flow: %s\n", flowURI)
		flowJSON = pps.embeddedMgr.GetEmbeddedFlowJSON(flowURI)

	} else if strings.HasPrefix(flowURI, uriSchemeFile) {

		log.Debugf("Loading Local Flow: %s\n", flowURI)
		flowFilePath, _ := util.URLStringToFilePath(flowURI)

		flowJSON, _ = ioutil.ReadFile(flowFilePath)

	} else {

		log.Debugf("Loading Remote Flow: %s\n", flowURI)

		req, err := http.NewRequest("GET", flowURI, nil)
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			panic(err) //todo probably shouldn't panic
		}
		defer resp.Body.Close()

		log.Debug("response Status:", resp.Status)

		if resp.StatusCode >= 300 {
			//not found
			return nil
		}

		body, _ := ioutil.ReadAll(resp.Body)
		flowJSON = body
	}

	if flowJSON != nil {
		var defRep flow.DefinitionRep
		json.Unmarshal(flowJSON, &defRep)

		def, err := flow.NewDefinition(&defRep)

		if err != nil {
			log.Errorf("Error unmarshalling flow: %s", err.Error())
			log.Debugf("Failed to unmarshal: %s", string(flowJSON))

			return nil
		}

		//todo optimize this - not needed if flow doesn't have expressions
		//todo have a registry for this?
		def.SetLinkExprManager(fggos.NewGosLinkExprManager(def))
		//def.SetLinkExprManager(fglua.NewLuaLinkExprManager(def))

		//synchronize
		pps.mutex.Lock()
		pps.flowCache[flowURI] = def
		pps.mutex.Unlock()

		return def
	}

	log.Debugf("Flow Not Found: %s\n", flowURI)

	return nil
}
