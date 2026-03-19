import networkx as nx
import json
import sys

# Graph-based Coordinated Fraud Attack Detection
def detect_coordinated_attack(nodes, edges):
    """
    nodes: list of user IDs involved in recent claims
    edges: list of tuples (user1, user2) indicating shared device/IP/GPS location
    """
    G = nx.Graph()
    G.add_nodes_from(nodes)
    G.add_edges_from(edges)
    
    # Find connected components (potential coordinated rings)
    components = list(nx.connected_components(G))
    fraud_rings = [list(c) for c in components if len(c) > 2] # Flag rings of 3 or more users
    
    risk_level = "HIGH" if len(fraud_rings) > 0 else "LOW"
    
    return {
        "graph_size": len(G.nodes),
        "total_edges": len(G.edges),
        "detected_fraud_rings": fraud_rings,
        "ring_count": len(fraud_rings),
        "network_risk_level": risk_level
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Expect dict with arrays of nodes and edges
        try:
            data = json.loads(sys.argv[1])
            res = detect_coordinated_attack(data.get("nodes", []), data.get("edges", []))
            print(json.dumps(res))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        # Mock data output
        nodes = ["u1", "u2", "u3", "u4", "u5"]
        edges = [("u1", "u2"), ("u2", "u3"), ("u3", "u1"), ("u4", "u5")]
        print(json.dumps(detect_coordinated_attack(nodes, edges)))
